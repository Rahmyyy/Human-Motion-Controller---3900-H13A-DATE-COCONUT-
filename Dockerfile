FROM node:24-trixie AS node
FROM rust:1.96-trixie
COPY --from=node /usr/local /usr/local

RUN rustup component add rustfmt clippy llvm-tools-preview \
  && cargo install cargo-llvm-cov --version 0.8.7 --locked

# install all dependencies for Tauri (debian)
RUN apt update && apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libclang-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY src-tauri/Cargo.toml src-tauri/Cargo.lock ./src-tauri/
COPY src-tauri/src/lib.rs ./src-tauri/src/lib.rs
RUN cargo fetch --manifest-path src-tauri/Cargo.toml

COPY . .

CMD ["bash", "scripts/check.sh"]
