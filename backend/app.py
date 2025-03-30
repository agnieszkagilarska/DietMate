from config import AppConfig
from src.GPT.tools import stream_response
from tools import generate_jwt, require_valid_token
from flask import request, jsonify, Response
from typing import Dict, Any
import datetime
import groq
import uuid
import datetime
import bcrypt
from bson.objectid import ObjectId
import os
############################################################################################################

app_config = AppConfig()
app = app_config.app
redis_client = app_config.r
collection1 = app_config.collection1
db = app_config.db

########################################### SESSION ENDPOINTS ###########################################

@app.route('/api/session', methods=['GET'])
def manage_session():
    """
    Create a new session and generate JWT token.

    This endpoint creates a new session with a unique UUID and generates a corresponding JWT token.

    Returns:
        tuple: A tuple containing:
            - dict: JSON response with:
                - message (str): Success message
                - token (str): Generated JWT token
            - int: HTTP 200 status code
    """
    new_session_id = str(uuid.uuid4())
    token = generate_jwt(new_session_id)
    return jsonify({
        "message": "New session created",
        "token": token
    }), 200

########################################### GPT ENDPOINTS ###########################################
@app.route('/api/askGPT', methods=['POST'])
@require_valid_token
def ask_gpt_endpoint(session_id: str) -> Response:
    """
    Protected endpoint to interact with GPT-like models for streaming responses.
    Session verification is handled by the require_valid_token decorator.

    Args:
        session_id: Automatically injected by the decorator after token verification
    """
    try:
        data: Dict[str, Any] = request.json or {}
        message: str = data.get('message', '')
        file_name: str = data.get('fileName', '')
        file_content: str = data.get('fileContent', '')

        response_content = []
        client: groq.Groq = groq.Groq()

        def generate_stream():
            for chunk in stream_response(message, file_name, file_content, client, session_id, collection1):
                response_content.append(chunk)
                yield chunk

        response = Response(generate_stream(), content_type='text/event-stream')

        @response.call_on_close
        def save_to_database():
            bot_message = ''.join(response_content)
            try:
                document = {
                    "session_id": session_id,
                    "user_message": message,
                    "bot_message": bot_message,
                    "file_name": file_name,
                    "file_content": file_content,
                    "date_added": datetime.datetime.now(),
                    "model": os.getenv("GROQ_GPT_MODEL", "")
                }
                collection1.insert_one(document)

            except Exception as db_error:
                print(f"Error saving interaction to the database: {db_error}")

        return response
    except Exception as e:
        return Response(f"***ERROR***: {e}", status=500)
    

########################################### REDIS ENDPOINTS ###########################################
    
@app.route('/api/redis/list', methods=['GET'])
@require_valid_token
def get_values_from_set(session_id: str):
    """
    Protected endpoint to get all values from a given Redis set for a specific session_id.

    Args:
        session_id: Automatically injected by the decorator after token verification.
        set_name: Query parameter defining the Redis set to retrieve.

    Returns:
        JSON response with the list of values associated with the session_id.
    """
    try:
        set_name = request.args.get("set_name")

        if not set_name:
            return jsonify({"error": "set_name query parameter is required"}), 400

        set_values = redis_client.smembers(set_name)

        user_values = [
            value.decode("utf-8").split(":", 1)[1]
            for value in set_values
            if value.decode("utf-8").startswith(f"{session_id}:")
        ]

        return jsonify({
            "set_name": set_name,
            "values": user_values
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch values from set: {str(e)}"}), 500


@app.route('/api/redis/add', methods=['POST'])
@require_valid_token
def add_to_set(session_id: str):
    """
    Protected endpoint to add a value to a given Redis set.

    Args:
        session_id: Automatically injected by the decorator after token verification.
        set_name: Query parameter defining the Redis set to update.
        value: JSON body parameter defining the value to add.

    Returns:
        JSON response indicating success or failure.
    """
    try:
        set_name = request.args.get("set_name")
        data = request.json or {}
        value = data.get("value")
        if not set_name:
            return jsonify({"error": "set_name query parameter is required"}), 400
        if not value:
            return jsonify({"error": "Value is required in the request body"}), 400

        entry = f"{session_id}:{value}"

        redis_client.sadd(set_name, entry)

        return jsonify({
            "message": f"Value '{value}' added to set '{set_name}'"
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to add value to set: {str(e)}"}), 500
    

@app.route('/api/redis/update', methods=['PUT'])
@require_valid_token
def update_in_set(session_id: str):
    """
    Protected endpoint to update a value in a given Redis set.

    Args:
        session_id: Automatically injected by the decorator after token verification.
        set_name: Query parameter defining the Redis set to update.
        old_value: JSON body parameter defining the value to be replaced.
        new_value: JSON body parameter defining the new value.

    Returns:
        JSON response indicating success or failure.
    """
    try:
        set_name = request.args.get("set_name")
        data = request.json or {}
        old_value = data.get("old_value")
        new_value = data.get("new_value")

        if not set_name:
            return jsonify({"error": "set_name query parameter is required"}), 400
        if not old_value or not new_value:
            return jsonify({"error": "Both old_value and new_value are required in the request body"}), 400

        old_entry = f"{session_id}:{old_value}"
        new_entry = f"{session_id}:{new_value}"

        if redis_client.sismember(set_name, old_entry):
            redis_client.srem(set_name, old_entry)
            redis_client.sadd(set_name, new_entry)
            return jsonify({
                "message": f"Value '{old_value}' updated to '{new_value}' in set '{set_name}'"
            }), 200
        else:
            return jsonify({"error": f"Old value '{old_value}' not found in set '{set_name}'"}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to update value in set: {str(e)}"}), 500

@app.route('/api/redis/delete', methods=['DELETE'])
@require_valid_token
def delete_from_set(session_id: str):
    """
    Protected endpoint to delete a value from a given Redis set.

    Args:
        session_id: Automatically injected by the decorator after token verification.
        set_name: Query parameter defining the Redis set to delete the value from.
        value: JSON body parameter defining the value to delete.

    Returns:
        JSON response indicating success or failure.
    """
    try:
        set_name = request.args.get("set_name")
        data = request.json or {}
        value = data.get("value")

        if not set_name:
            return jsonify({"error": "set_name query parameter is required"}), 400
        if not value:
            return jsonify({"error": "Value is required in the request body"}), 400

        entry = f"{session_id}:{value}"

        if redis_client.sismember(set_name, entry):
            redis_client.srem(set_name, entry)
            return jsonify({
                "message": f"Value '{value}' deleted from set '{set_name}'"
            }), 200
        else:
            return jsonify({"error": f"Value '{value}' not found in set '{set_name}'"}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to delete value from set: {str(e)}"}), 500


########################################### OTHER ENDPOINTS ###########################################

@app.route("/")
def home():
    return jsonify({"message": "Welcome to the Flask API for Next.js - DietMate!"})

@app.route("/api/purchase", methods=["POST"])
def purchase_diet():
    data = request.json
    diet_id = data.get("dietId")
    user_data = data.get("userData", {})
    user_name = user_data.get("name", "Anonymous")
    return jsonify({"message": f"User {user_name} has purchased diet ID {diet_id}!"}), 200

###################### USERS ######################
users_collection = db['users']

##################### ADD USER ######################
@app.route("/api/users", methods=["POST"])
def create_user():
    try:
        data = request.get_json()
        required_fields = [
            "nickname", "email", "password", "first_name", "last_name",
            "weight", "height", "age", "role"
        ]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing fields"}), 400

        if users_collection.find_one({"email": data["email"]}):
            return jsonify({"error": "Email already exists"}), 409

        if users_collection.find_one({"nickname": data["nickname"]}):
            return jsonify({"error": "Nickname already exists"}), 409

        # Hash hasła jako string
        hashed_password = bcrypt.hashpw(
            data["password"].encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        new_user = {
            "nickname": data["nickname"],
            "email": data["email"],
            "password": hashed_password,
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "weight": data["weight"],
            "height": data["height"],
            "age": data["age"],
            "role": data["role"]
        }

        users_collection.insert_one(new_user)

        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

##################### USERS LIST ######################

@app.route("/api/users", methods=["GET"])
def get_all_users():
    try:
        users = []
        for user in users_collection.find():
            user["_id"] = str(user["_id"])
            user.pop("password", None)
            users.append(user)
        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
##################### GET USER (MAIL) ######################

@app.route("/api/users/<string:email>", methods=["GET"])
def get_user_by_email(email):
    try:
        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"error": "User not found"}), 404
        user["_id"] = str(user["_id"])
        user.pop("password", None)
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
##################### UPDATE USER (MAIL) ######################

@app.route("/api/users/<string:email>", methods=["PUT"])
def update_user_by_email(email):
    try:
        data = request.get_json()
        if "password" in data:
            data["password"] = bcrypt.hashpw(
                data["password"].encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

        result = users_collection.update_one({"email": email}, {"$set": data})
        if result.matched_count == 0:
            return jsonify({"error": "User not found"}), 404

        return jsonify({"message": "User updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
##################### DELETE USER (MAIL) ######################

@app.route("/api/users/<string:email>", methods=["DELETE"])
def delete_user_by_email(email):
    try:
        result = users_collection.delete_one({"email": email})
        if result.deleted_count == 0:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
##################### USER LOGIN (MAIL + PASS) ######################

@app.route("/api/login", methods=["POST"])
def login_user():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
            return jsonify({"error": "Invalid email or password"}), 401

        session_id = str(user["_id"])
        token = generate_jwt(session_id)

        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "nickname": user.get("nickname"),
                "first_name": user.get("first_name"),
                "email": user.get("email"),
                "role": user.get("role")
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

##################### DIETS ######################
diets_collection = db['diets']

##################### GET DIETS ######################
@app.route("/api/diets", methods=["GET"])
def get_all_diets():
    try:
        diets = []
        for diet in diets_collection.find():
            diet["_id"] = str(diet["_id"])
            diets.append(diet)
        return jsonify({"diets": diets}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

##################### GET 1 DIET (ID) ######################
@app.route("/api/diets/<string:diet_id>", methods=["GET"])
def get_diet_by_id(diet_id):
    try:
        diet = diets_collection.find_one({"_id": ObjectId(diet_id)})
        if not diet:
            return jsonify({"error": "Diet not found"}), 404
        diet["_id"] = str(diet["_id"])
        return jsonify(diet), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

##################### ADD DIET ######################
@app.route("/api/diets", methods=["POST"])
def create_diet():
    try:
        data = request.get_json()
        required_fields = ["diet_name", "description", "rating", "meals"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing fields"}), 400

        result = diets_collection.insert_one(data)

        return jsonify({
            "message": "Diet created successfully",
            "diet_id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

##################### UPDATE DIET ######################
@app.route("/api/diets/<string:diet_id>", methods=["PUT"])
def update_diet(diet_id):
    try:
        data = request.get_json()
        result = diets_collection.update_one(
            {"_id": ObjectId(diet_id)},
            {"$set": data}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Diet not found"}), 404

        return jsonify({"message": "Diet updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

##################### DELETE DIET ######################
@app.route("/api/diets/<string:diet_id>", methods=["DELETE"])
def delete_diet(diet_id):
    try:
        result = diets_collection.delete_one({"_id": ObjectId(diet_id)})
        if result.deleted_count == 0:
            return jsonify({"error": "Diet not found"}), 404

        return jsonify({"message": "Diet deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
