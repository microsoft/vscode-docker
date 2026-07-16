# Use the published grok2api container image as the base image
FROM ghcr.io/chenyme/grok2api:latest

WORKDIR /app

# Copy your config file into the image. Make sure your-config.yml exists in the same directory as this Dockerfile.
COPY your-config.yml /app/your-config.yml

# Start grok2api with a config file. Adjust the command if the image uses a different entrypoint or config path.
CMD ["grok2api", "--config", "/app/your-config.yml"]
