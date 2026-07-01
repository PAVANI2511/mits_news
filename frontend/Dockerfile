FROM node:20-alpine

WORKDIR /app

COPY package*.json /app/

RUN npm install

COPY . /app/

EXPOSE 5173

# Run Vite in host mode so it's accessible externally
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
