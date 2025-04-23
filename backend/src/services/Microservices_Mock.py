import redis
import json
import time
import uuid
import threading
from datetime import datetime

# Konfiguracja klienta Redis
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# ----- Funkcje pomocnicze -----

def generate_order_id():
    """Generuje unikalny identyfikator zamówienia"""
    return f"order-{uuid.uuid4().hex[:8]}"

def process_payment(order_data):
    """Symuluje przetwarzanie płatności"""
    print(f"Przetwarzanie płatności w wysokości: {calculate_order_total(order_data)} PLN")
    time.sleep(1)  # Symulacja czasu przetwarzania
    return True  # Płatność zaakceptowana

def calculate_order_total(order_data):
    """Symulacja kalkulacji sumy zamówienia"""
    return sum(item.get('price', 10) for item in order_data.get('items', []))

def get_order_details(order_id):
    """Pobiera szczegóły zamówienia ze strumienia"""
    # W rzeczywistym systemie moglibyśmy użyć XRANGE do wyszukania zamówienia
    # Tutaj używamy prostej symulacji
    results = redis_client.xrevrange('orders_stream', count=100)
    for msg_id, data in results:
        if data.get('order_id') == order_id:
            return data
    return None

def update_inventory(order_details):
    """Aktualizuje stan magazynowy"""
    print(f"Aktualizacja stanu magazynowego dla zamówienia: {order_details['order_id']}")
    time.sleep(0.5)  # Symulacja aktualizacji bazy danych
    return True

# ----- Serwis Zamówień -----

def create_order(user_id, cart_items, payment_method):
    """Tworzy nowe zamówienie i dodaje je do strumienia Redis"""
    order_id = generate_order_id()
    
    # Przygotowanie danych zamówienia
    order_data = {
        'order_id': order_id,
        'user_id': user_id,
        'items': json.dumps(cart_items),  # Redis wymaga stringów, więc serializujemy listę
        'payment_method': payment_method,
        'status': 'created',
        'timestamp': datetime.now().isoformat()
    }
    
    # Dodanie wiadomości do strumienia Redis
    message_id = redis_client.xadd(
        'orders_stream',  # nazwa strumienia
        order_data,       # dane zamówienia jako pola wiadomości
        maxlen=10000      # maksymalna długość strumienia
    )
    
    print(f"Zamówienie {order_id} zostało dodane do strumienia z ID: {message_id}")
    return order_id

# ----- Serwis Płatności -----

def process_payments():
    """Przetwarza płatności dla zamówień"""
    # Utworzenie grupy konsumentów, jeśli nie istnieje
    try:
        redis_client.xgroup_create('orders_stream', 'payment-processors', mkstream=True)
    except redis.exceptions.ResponseError:
        # Grupa już istnieje
        pass
    
    print("Serwis płatności rozpoczął nasłuchiwanie zamówień...")
    
    while True:
        try:
            # Pobieranie nowych wiadomości z grupy konsumentów
            messages = redis_client.xreadgroup(
                'payment-processors',            # nazwa grupy
                'payment-worker-1',              # identyfikator konsumenta
                {'orders_stream': '>'},          # '>' oznacza nowe, nieprzeczytane wiadomości
                count=10,                        # pobierz maksymalnie 10 wiadomości
                block=2000                       # blokuj na 2 sekundy, potem sprawdź ponownie
            )
            
            if not messages:
                continue
                
            # Przetwarzanie wiadomości
            for stream_name, stream_messages in messages:
                for message_id, message_data in stream_messages:
                    print(f"Przetwarzanie płatności dla zamówienia: {message_data['order_id']}")
                    
                    # Deserializacja listy przedmiotów
                    if 'items' in message_data:
                        message_data['items'] = json.loads(message_data['items'])
                    
                    # Logika przetwarzania płatności
                    payment_successful = process_payment(message_data)
                    
                    if payment_successful:
                        # Publikowanie informacji o płatności
                        payment_confirmation = {
                            'order_id': message_data['order_id'],
                            'status': 'payment_completed',
                            'timestamp': time.time()
                        }
                        redis_client.xadd('payments_stream', payment_confirmation)
                        
                    # Potwierdzenie przetworzenia wiadomości
                    redis_client.xack('orders_stream', 'payment-processors', message_id)
        except KeyboardInterrupt:
            print("Zatrzymywanie serwisu płatności...")
            break
        except Exception as e:
            print(f"Błąd w serwisie płatności: {e}")
            time.sleep(1)

# ----- Serwis Magazynu -----

def process_inventory():
    """Przetwarza zamówienia z potwierdzoną płatnością"""
    # Nasłuchujemy strumienia płatności, aby wiedzieć, które zamówienia zostały opłacone
    try:
        redis_client.xgroup_create('payments_stream', 'inventory-processors', mkstream=True)
    except redis.exceptions.ResponseError:
        pass
    
    print("Serwis magazynu rozpoczął nasłuchiwanie opłaconych zamówień...")
    
    while True:
        try:
            messages = redis_client.xreadgroup(
                'inventory-processors',
                'inventory-worker-1',
                {'payments_stream': '>'},
                count=5,
                block=2000  # czekaj maksymalnie 2 sekundy na nowe wiadomości
            )
            
            if not messages:
                continue
                
            for stream_name, stream_messages in messages:
                for message_id, message_data in stream_messages:
                    order_id = message_data['order_id']
                    print(f"Przygotowywanie produktów dla zamówienia: {order_id}")
                    
                    # Pobieranie szczegółów zamówienia - odczyt z wcześniejszego strumienia
                    order_details = get_order_details(order_id)
                    
                    # Aktualizacja stanu magazynowego
                    success = update_inventory(order_details)
                    
                    if success:
                        # Publikowanie informacji o przygotowaniu zamówienia
                        redis_client.xadd('shipping_stream', {
                            'order_id': order_id,
                            'status': 'ready_for_shipping',
                            'timestamp': time.time()
                        })
                    
                    # Potwierdzenie przetworzenia wiadomości
                    redis_client.xack('payments_stream', 'inventory-processors', message_id)
        except KeyboardInterrupt:
            print("Zatrzymywanie serwisu magazynu...")
            break
        except Exception as e:
            print(f"Błąd w serwisie magazynu: {e}")
            time.sleep(1)

# ----- Funkcja demonstracyjna -----

def create_sample_order():
    """Tworzy przykładowe zamówienie na podstawie koszyka z Postman"""
    # Produkty z koszyka zakupowego z kolekcji Postman
    cart_items = [
        {"name": "Jogurt grecki naturalny 400g", "price": 5.99, "quantity": 2},
        {"name": "Chleb pełnoziarnisty 500g", "price": 4.50, "quantity": 1},
        {"name": "Oliwa z oliwek extra virgin 500ml", "price": 29.99, "quantity": 1},
        {"name": "Pomidory malinowe 500g", "price": 7.99, "quantity": 1},
        {"name": "Ser feta 200g", "price": 8.99, "quantity": 1}
    ]
    
    # Utworzenie zamówienia
    return create_order(
        user_id="user123",
        cart_items=cart_items,
        payment_method="card"
    )

# ----- Main -----

def main():
    """Funkcja główna demonstrująca działanie systemu"""
    # Czyszczenie strumieni dla celów demonstracyjnych
    try:
        redis_client.delete('orders_stream', 'payments_stream', 'shipping_stream')
        print("Strumienie zostały wyczyszczone.")
    except:
        pass
    
    # Uruchomienie serwisów w osobnych wątkach
    payment_thread = threading.Thread(target=process_payments)
    payment_thread.daemon = True
    payment_thread.start()
    
    inventory_thread = threading.Thread(target=process_inventory)
    inventory_thread.daemon = True
    inventory_thread.start()
    
    # Chwila na inicjalizację serwisów
    time.sleep(1)
    
    try:
        # Utworzenie przykładowego zamówienia
        print("\n----- Tworzenie nowego zamówienia -----")
        order_id = create_sample_order()
        
        # Czekamy, aż zamówienie przejdzie przez cały proces
        print("\nObserwuj przetwarzanie zamówienia przez serwisy...")
        time.sleep(10)
        
        # Sprawdzenie statusu zamówienia w strumieniu wysyłek
        print("\n----- Status końcowy zamówienia -----")
        shipping_messages = redis_client.xrange('shipping_stream', '-', '+')
        if shipping_messages:
            for msg_id, data in shipping_messages:
                if data.get('order_id') == order_id:
                    print(f"Zamówienie {order_id} jest gotowe do wysyłki!")
                    break
            else:
                print(f"Zamówienie {order_id} jest nadal w trakcie przetwarzania.")
        else:
            print("Brak zamówień gotowych do wysyłki.")
        
        print("\nNaciśnij Ctrl+C, aby zakończyć demonstrację...")
        # Kontynuuj działanie wątków w tle
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nZamykanie aplikacji...")
        time.sleep(1)

if __name__ == "__main__":
    main()