from config import AppConfig
from src.GPT.tools import stream_response
from tools import generate_jwt, require_valid_token
from flask import request, jsonify, Response
from typing import Dict, Any
import datetime
import groq
import uuid
import os

app_config = AppConfig()
app = app_config.app
redis_client = app_config.r
collection1 = app_config.collection1

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
