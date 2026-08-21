#!/usr/bin/env python3
"""Servidor estático local para desarrollo. Desactiva la caché del navegador
para que los cambios en JS y CSS se vean de inmediato. No usar en producción."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class SinCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        tipo = super().guess_type(path)
        if str(path).endswith('.js'):
            return 'text/javascript; charset=utf-8'
        if str(path).endswith('.html'):
            return 'text/html; charset=utf-8'
        if str(path).endswith('.css'):
            return 'text/css; charset=utf-8'
        return tipo

if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print(f'Cotizador en http://localhost:{puerto}')
    ThreadingHTTPServer(('127.0.0.1', puerto), SinCache).serve_forever()
