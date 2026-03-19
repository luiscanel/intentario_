#!/bin/bash

BASE_URL="http://localhost:3001"
COOKIE_FILE="/tmp/cookies.txt"

# Login y guardar cookie
curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jorge.canel@grupoalmo.com","password":"admin123"}' > /dev/null

echo "=== QA Testing - Módulos (Completo) ==="
echo ""

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X GET "$BASE_URL$endpoint" -H "Content-Type: application/json")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X POST "$BASE_URL$endpoint" -H "Content-Type: application/json" -d "$data")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X PUT "$BASE_URL$endpoint" -H "Content-Type: application/json" -d "$data")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" -X DELETE "$BASE_URL$endpoint" -H "Content-Type: application/json")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo "✅ $method $endpoint - $description - HTTP $http_code"
    else
        echo "❌ $method $endpoint - $description - HTTP $http_code"
        echo "   Response: ${body:0:150}"
    fi
}

# === SERVIDORES ===
echo "--- SERVIDORES ---"
test_endpoint "GET" "/api/servidores" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/servidores" -H "Content-Type: application/json" -d '{"pais":"Colombia","host":"test","nombreVM":"TestVM","ip":"192.168.1.200","cpu":4,"memoria":"8","disco":"500","ambiente":"Produccion","estado":"Activo"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/servidores/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/servidores/$ID" '{"estado":"Inactivo"}' "Actualizar"
test_endpoint "DELETE" "/api/servidores/$ID" "" "Eliminar"

# === INVENTARIO FÍSICO ===
echo ""
echo "--- INVENTARIO FÍSICO ---"
test_endpoint "GET" "/api/inventario-fisico" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/inventario-fisico" -H "Content-Type: application/json" -d '{"pais":"Colombia","categoria":"Laptop","marca":"Dell","serie":"ABC123","estado":"Activo"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/inventario-fisico/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/inventario-fisico/$ID" '{"estado":"Inactivo"}' "Actualizar"
test_endpoint "DELETE" "/api/inventario-fisico/$ID" "" "Eliminar"

# === INVENTARIO CLOUD ===
echo ""
echo "--- INVENTARIO CLOUD ---"
test_endpoint "GET" "/api/inventario-cloud" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/inventario-cloud" -H "Content-Type: application/json" -d '{"tenant":"test","nube":"AWS","instanceName":"test","ipPublica":"1.2.3.4"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/inventario-cloud/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/inventario-cloud/$ID" '{"estado":"stopped"}' "Actualizar"
test_endpoint "DELETE" "/api/inventario-cloud/$ID" "" "Eliminar"

# === CONTRATOS ===
echo ""
echo "--- CONTRATOS ---"
test_endpoint "GET" "/api/contratos" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/contratos" -H "Content-Type: application/json" -d '{"tipo":"Mantenimiento","numero":"CON-001","objeto":"Soporte","monto":1000}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/contratos/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/contratos/$ID" '{"estado":"Vencido"}' "Actualizar"
test_endpoint "DELETE" "/api/contratos/$ID" "" "Eliminar"

# === LICENCIAS ===
echo ""
echo "--- LICENCIAS ---"
test_endpoint "GET" "/api/licencias" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/licencias" -H "Content-Type: application/json" -d '{"nombre":"Office","tipo":"Office","cantidad":10}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/licencias/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/licencias/$ID" '{"cantidad":5}' "Actualizar"
test_endpoint "DELETE" "/api/licencias/$ID" "" "Eliminar"

# === PROVEEDORES ===
echo ""
echo "--- PROVEEDORES ---"
test_endpoint "GET" "/api/proveedores" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/proveedores" -H "Content-Type: application/json" -d '{"nombre":"Proveedor Test","contacto":"Juan"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/proveedores/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/proveedores/$ID" '{"activo":false}' "Actualizar"
test_endpoint "DELETE" "/api/proveedores/$ID" "" "Eliminar"

# === CERTIFICADOS ===
echo ""
echo "--- CERTIFICADOS SSL ---"
test_endpoint "GET" "/api/certificados" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/certificados" -H "Content-Type: application/json" -d '{"dominio":"test.com","tipo":"single","fechaVencimiento":"2026-12-31"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/certificados/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/certificados/$ID" '{"notas":"test"}' "Actualizar"
test_endpoint "DELETE" "/api/certificados/$ID" "" "Eliminar"

# === CAMBIOS ===
echo ""
echo "--- CAMBIOS ---"
test_endpoint "GET" "/api/cambios" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/cambios" -H "Content-Type: application/json" -d '{"titulo":"Cambio Test","descripcion":"Desc","tipo":"hardware","prioridad":"media"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/cambios/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/cambios/$ID" '{"estado":"aprobado"}' "Actualizar"
test_endpoint "DELETE" "/api/cambios/$ID" "" "Eliminar"

# === BACKUPS PROGRAMADOS ===
echo ""
echo "--- BACKUPS PROGRAMADOS ---"
test_endpoint "GET" "/api/backups-programados" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/backups-programados" -H "Content-Type: application/json" -d '{"nombre":"Backup Test","tipo":"completo","frecuencia":"daily","hora":2,"minuto":0}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/backups-programados/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/backups-programados/$ID" '{"activo":false}' "Actualizar"
test_endpoint "DELETE" "/api/backups-programados/$ID" "" "Eliminar"

# === COSTOS ===
echo ""
echo "--- COSTOS CLOUD ---"
test_endpoint "GET" "/api/costos" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/costos" -H "Content-Type: application/json" -d '{"proveedor":"AWS","cuenta":"123","servicio":"EC2","mes":"2026-03","monto":100}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/costos/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/costos/$ID" '{"monto":200}' "Actualizar"
test_endpoint "DELETE" "/api/costos/$ID" "" "Eliminar"

# === ALERTAS ===
echo ""
echo "--- ALERTAS ---"
test_endpoint "GET" "/api/alertas" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/alertas" -H "Content-Type: application/json" -d '{"tipo":"info","titulo":"Alerta Test","mensaje":"Msg"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/alertas/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/alertas/$ID" '{"leida":true}' "Actualizar"
test_endpoint "DELETE" "/api/alertas/$ID" "" "Eliminar"

# === MONITOR ===
echo ""
echo "--- MONITOR ---"
test_endpoint "GET" "/api/monitor" "" "Listar"
# Usar IP única para evitar duplicado
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/monitor" -H "Content-Type: application/json" -d '{"ip":"10.0.0.99","nombre":"TestMon","tipo":"ping"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/monitor/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/monitor/$ID" '{"activo":false}' "Actualizar"
test_endpoint "DELETE" "/api/monitor/$ID" "" "Eliminar"

# === SERVICIOS ===
echo ""
echo "--- SERVICIOS ---"
test_endpoint "GET" "/api/servicios" "" "Listar"
ID=$(curl -s -b "$COOKIE_FILE" -X POST "$BASE_URL/api/servicios" -H "Content-Type: application/json" -d '{"ip":"8.8.8.9","nombre":"Google","tipo":"ping"}' | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
test_endpoint "GET" "/api/servicios/$ID" "" "Obtener ID"
test_endpoint "PUT" "/api/servicios/$ID" '{"activo":false}' "Actualizar"
test_endpoint "DELETE" "/api/servicios/$ID" "" "Eliminar"

# === ADMIN USUARIOS ===
echo ""
echo "--- ADMIN USUARIOS ---"
test_endpoint "GET" "/api/admin/usuarios" "" "Listar"
test_endpoint "GET" "/api/admin/usuarios/1" "" "Obtener ID"
test_endpoint "PUT" "/api/admin/usuarios/1" '{"nombre":"Updated"}' "Actualizar"

# === DASHBOARD ===
echo ""
echo "--- DASHBOARD ---"
test_endpoint "GET" "/api/dashboard/stats" "" "Stats"

# === EMAIL ===
echo ""
echo "--- EMAIL CONFIG ---"
test_endpoint "GET" "/api/email/config" "" "Get config"

echo ""
echo "=== QA Completado ==="
rm -f "$COOKIE_FILE"
