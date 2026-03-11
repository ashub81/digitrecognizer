# MNIST CNN Digit Recognizer (Standalone)

This is a separate project that trains a CNN on MNIST and serves a simple page where you can draw a digit and get predictions (similar to the 3Blue1Brown-style demo).

## 1. Setup

```bash
cd /Users/ashish/Documents/codex/digit-recognizer
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. Train the model

```bash
python train.py --epochs 5
```

The model is saved to:

`models/mnist_cnn.keras`

## 3. Start the app

```bash
uvicorn app:app --reload --port 8001
```

Open:

`http://localhost:8001`

## Notes

- The API expects a flattened 28x28 grayscale array (`784` values in `[0, 1]`).
- If the model file is missing, the `/predict` endpoint returns an error telling you to run `train.py`.

## Azure deployment

This project now includes a `Dockerfile`, which is the simplest way to deploy it to Azure Container Apps and get a public URL you can share.

### 1. Log in and prepare Azure

```bash
az login
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

### 2. Deploy from this folder

Run these commands from `/Users/ashish/Documents/codex/digit-recognizer`:

```bash
RESOURCE_GROUP=mnist-digit-rg
APP_NAME=mnist-digit-app
ENV_NAME=mnist-digit-env
LOCATION=eastus

az group create --name $RESOURCE_GROUP --location $LOCATION
az containerapp up \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENV_NAME \
  --location $LOCATION \
  --source . \
  --target-port 8000 \
  --ingress external \
  --cpu 1.0 \
  --memory 2.0Gi
```

Azure will build the image from the included `Dockerfile`, deploy it, and print a public HTTPS URL.

### 3. Share it

After deployment, get the public URL any time with:

```bash
az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

Send that URL to anyone. The app will be public on the internet.
