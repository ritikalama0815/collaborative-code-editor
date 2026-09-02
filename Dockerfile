# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.20.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /usr/src/app

################################################################################
# Create a stage for installing production dependencies.
FROM base as deps

# Copy package.json and package-lock.json into the container
COPY package.json package-lock.json ./

# Install production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps as build

# Copy the rest of the source files into the image
COPY . .

# Run the build script
RUN npm run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
FROM base as final

# Use production node environment by default
ENV NODE_ENV production

# Run the application as a non-root user
USER node

# Copy package.json so that package manager commands can be used
COPY package.json .

# Copy production dependencies and built application
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/public ./build

# Expose the port that the application listens on
EXPOSE 3000

# Run the application
CMD ["npx", "serve", "-s", "build"]