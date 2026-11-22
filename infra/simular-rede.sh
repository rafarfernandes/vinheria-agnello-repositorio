#!/usr/bin/env bash
# Simula a rede da Vinheria Agnello em Linux usando network namespaces (o mesmo isolamento de rede
# que o Docker usa por baixo dos containers). Cada "máquina" é um namespace ligado a uma bridge:
#
#   br-vinheria (10.10.0.1)  -> gateway + servidor DHCP/DNS (dnsmasq)
#   ns catalogo              -> catalogo-service  (IP reservado 10.10.0.10)
#   ns pedidos               -> pedidos-service   (IP reservado 10.10.0.11)
#   ns caixa                 -> estação do caixa da loja (IP dinâmico do pool .100-.150)
#
# Uso: sudo infra/simular-rede.sh up | down | run <ns> <comando...>
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

declare -A MAC=( [catalogo]=02:00:0a:0a:00:0a [pedidos]=02:00:0a:0a:00:0b [caixa]=02:00:0a:0a:00:64 )

up() {
  ip link add br-vinheria type bridge
  ip addr add 10.10.0.1/24 dev br-vinheria
  ip link set br-vinheria up
  # libera o tráfego entre as "máquinas" da bridge (o Docker deixa a policy de FORWARD em DROP)
  iptables -C FORWARD -i br-vinheria -o br-vinheria -j ACCEPT 2>/dev/null || iptables -I FORWARD -i br-vinheria -o br-vinheria -j ACCEPT

  for ns in catalogo pedidos caixa; do
    ip netns add "$ns"
    ip link add "veth-$ns" type veth peer name eth0 netns "$ns"
    ip link set "veth-$ns" master br-vinheria up
    ip netns exec "$ns" ip link set eth0 address "${MAC[$ns]}"
    ip netns exec "$ns" ip link set lo up
    ip netns exec "$ns" ip link set eth0 up
    mkdir -p "/etc/netns/$ns"; : > "/etc/netns/$ns/resolv.conf"
    echo "$ns" > "/etc/netns/$ns/hostname"
    printf 'send host-name "%s";\nrequest subnet-mask, routers, domain-name, domain-name-servers;\n' "$ns" > "/tmp/dhclient-$ns.conf"
  done

  dnsmasq --conf-file="$DIR/dnsmasq.conf" --log-facility=/tmp/vinheria-dnsmasq.log --pid-file=/tmp/vinheria-dnsmasq.pid
  sleep 1

  for ns in catalogo pedidos caixa; do
    ip netns exec "$ns" dhclient -v -1 -cf "/tmp/dhclient-$ns.conf" -lf "/tmp/dhclient-$ns.lease" \
       -pf "/tmp/dhclient-$ns.pid" eth0 2>&1 | grep -E 'DHCP|bound' || true
  done
}

down() {
  for ns in catalogo pedidos caixa; do
    [ -f "/tmp/dhclient-$ns.pid" ] && kill "$(cat /tmp/dhclient-$ns.pid)" 2>/dev/null || true
    ip netns del "$ns" 2>/dev/null || true
    rm -rf "/etc/netns/$ns"
  done
  [ -f /tmp/vinheria-dnsmasq.pid ] && kill "$(cat /tmp/vinheria-dnsmasq.pid)" 2>/dev/null || true
  ip link del br-vinheria 2>/dev/null || true
  rm -f /tmp/vinheria-dnsmasq.leases
  iptables -D FORWARD -i br-vinheria -o br-vinheria -j ACCEPT 2>/dev/null || true
}

# Executa um serviço dentro do namespace, com hostname próprio (como um container)
run() {
  local ns="$1"; shift
  ip netns exec "$ns" unshare --uts sh -c "hostname $ns; exec \"\$@\"" -- "$@"
}

cmd="${1:-up}"; shift || true; "$cmd" "$@"
