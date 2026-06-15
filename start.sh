#!/usr/bin/env bash

cd frontend && npm run dev &
cd backend && npm run dev &
wait
