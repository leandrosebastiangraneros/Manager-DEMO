import sys
import os

# Añadimos la carpeta 'backend' al path para poder importar main
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app

# Vercel espera un objeto llamado 'app' en el archivo index.py
# Esto permite que FastAPI funcione como una Vercel Function
