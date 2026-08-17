import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from src.main import app as fastapi_app
from fastapi.middleware.wsgi import WSGIMiddleware

application = WSGIMiddleware(fastapi_app)
