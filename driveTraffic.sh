#!/bin/bash

trap 'echo "Stopping all processes..."; kill $(jobs -p); exit' SIGINT SIGTERM

# host=http://localhost:80
host=https://pizza-service.squidward.click

(
while true; do
  curl -s $host/api/order/menu
  sleep 12
  echo "did menu"
done
) &

(
while true; do
  curl -s -X PUT $host/api/auth -d '{"email":"unknown@jwt.com", "password":"bad"}' -H 'Content-Type: application/json'
  sleep 25
  echo "did auth"
done
) &

(
while true; do
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "franchisee token: $token"
  sleep 40
  curl -X DELETE $host/api/auth -H "Authorization: Bearer $token"
  sleep 10
done
) &

(
while true; do
  echo "ORDERING PIZZA"
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }, { "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H "Authorization: Bearer $token"
  sleep 20
  curl -X DELETE $host/api/auth -H "Authorization: Bearer $token"
  sleep 9
done
) &

wait
