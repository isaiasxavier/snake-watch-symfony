# Use a stable version of Node.js (example: 18 LTS)
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (if available)
COPY package*.json ./

# Install Node.js dependencies for the main project
RUN npm install --production

# Copy all source code to the container
COPY . .

# Expose port 3000
EXPOSE 3000

# Ensure the bot listens on all network interfaces
CMD ["node", "bot.mjs"]