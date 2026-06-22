FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Runs Vite's dev server in the container rather than a build+nginx step - the
# simplest option for this assessment. A real deployment would build static
# assets and serve them behind nginx/a CDN instead.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
