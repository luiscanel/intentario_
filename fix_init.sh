#!/bin/bash
# ============================================
# Script para inicializar módulos y roles
# Ejecutar en el servidor de producción
# ============================================

echo "Inicializando módulos, roles y permisos del sistema..."

cd /opt/inventario-almo/server

# Ejecutar como usuario inventario
sudo -u inventario npx tsx scripts/inicializar_sistema.ts

echo "✅ Sistema inicializado correctamente"
