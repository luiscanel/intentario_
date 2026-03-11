#!/bin/bash
# ============================================
# Script para sincronizar módulos y roles
# Ejecutar en el servidor de producción
# NOTA: Este script NO borra datos existentes
# ============================================

echo "Sincronizando módulos, roles y permisos del sistema..."
echo "⚠️  Los datos existentes NO se borran"

cd /opt/inventario-almo/server

# Ejecutar como usuario inventario
sudo -u inventario npx tsx scripts/inicializar_sistema.ts

echo "✅ Sistema sincronizado correctamente"
