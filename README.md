# pantry-app

# Build and start both containers

docker-compose up --build

# Run in detached mode

docker-compose up -d --build

# View logs

docker-compose logs -f

# Stop containers

docker-compose down

# Stop and remove volumes (wipes database)

docker-compose down -v
