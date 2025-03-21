from app import app
from typing import NoReturn
from dotenv import load_dotenv
import secrets
import os
""""""""""""""""""""""""""""""""""""""""""""

def main() -> NoReturn:
    app.run(host='0.0.0.0', port=5000, debug=True)

if __name__ == "__main__":
    load_dotenv()
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        SECRET_KEY = secrets.token_hex(32)
        with open('.env', 'a') as f:
            f.write(f'\nSECRET_KEY={SECRET_KEY}')
    main()