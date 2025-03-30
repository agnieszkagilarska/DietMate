import multiprocessing
from dotenv import load_dotenv
import secrets
import os

bind = "0.0.0.0:5000"
workers = multiprocessing.cpu_count() * 2 + 1

accesslog = "-"
errorlog = "-"
loglevel = "info"

wsgi_app = "app:app"
