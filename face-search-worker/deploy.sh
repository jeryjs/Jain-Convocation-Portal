#!/bin/bash
# Face Search Worker Deployment Script for Linux/Mac

echo "============================================================"
echo "Face Search Worker - Deployment"
echo "============================================================"
echo ""
echo "Select engine:"
echo "  1. DeepFace (requires 'tf' conda environment)"
echo "  2. face_recognition (requires 'ml' conda environment)"
echo ""

read -p "Enter choice (1/2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "Activating 'tf' environment..."
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate tf
    if [ $? -ne 0 ]; then
        echo "Error: Failed to activate 'tf' environment"
        exit 1
    fi
    echo "Starting worker with DeepFace engine..."
    python worker.py --engine deepface
elif [ "$choice" = "2" ]; then
    echo ""
    echo "Activating 'ml' environment..."
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate ml
    if [ $? -ne 0 ]; then
        echo "Error: Failed to activate 'ml' environment"
        exit 1
    fi
    echo "Starting worker with face_recognition engine..."
    python worker.py --engine face_recognition
else
    echo ""
    echo "Invalid choice. Please run again and select 1 or 2."
    exit 1
fi
