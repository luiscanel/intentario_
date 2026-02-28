#!/usr/bin/env expect

set timeout 30
set password "123456789"

# Conectar como inventario
spawn ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null inventario@192.168.0.14

# Esperar y enviar contraseña de SSH
expect {
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "ERROR: Timeout esperando password SSH"
        exit 1
    }
}

# Esperar prompt de inventario
expect {
    -re {\$ $|inventario@} {
        # Enviar sudo su -
        send "sudo su -\r"
    }
    timeout {
        puts "ERROR: Timeout esperando prompt"
        exit 1
    }
}

# Esperar "password:" de sudo
expect {
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "ERROR: Timeout esperando password sudo"
        exit 1
    }
}

# Esperar prompt de root
expect {
    -re {# $|root@} {
        send "echo 'CONECTADO_COMO_ROOT'\r"
    }
    timeout {
        puts "ERROR: No se pudo obtener acceso root"
        exit 1
    }
}

expect "CONECTADO_COMO_ROOT"

# Ahora estamos como root - hacer hardening

send "echo 'inventario ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/inventario\r"
expect "# "

send "chmod 440 /etc/sudoers.d/inventario\r"
expect "# "

send "echo 'Hardening completado'\r"
expect "# "

send "exit\r"
expect eof

puts "\n=== HARDENING COMPLETADO ==="
