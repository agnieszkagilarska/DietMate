from app import app
from typing import NoReturn
from dotenv import load_dotenv
import secrets
import os
""""""""""""""""""""""""""""""""""""""""""""

def main() -> NoReturn:
    app.run(host='0.0.0.0', port=5000, debug=True)
main()