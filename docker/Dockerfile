FROM debian:jessie

RUN apt-get clean && apt-get update && apt-get install -y \
    make \
    wget \
    git \
    gcc \
    autoconf \
    automake \
    curl \
    pkg-config \
    libtool \
    libunistring-dev \
    libpcre3-dev \
    libssl-dev \
    libsqlite3-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp

RUN wget ftp://ftp-sop.inria.fr/indes/fp/Bigloo/bigloo4.3a-last.tar.gz \
    && tar -xzf bigloo*.tar.gz && cd bigloo* \
    && ./configure && make -j$(nproc) && make install

RUN git clone https://github.com/manuel-serrano/hop.git \
    && cd hop && git checkout 3.0.x \
    && ./configure && make -j$(nproc) && make install

RUN git clone https://github.com/colinvidal/hiphop.git \
    && mkdir /root/node_modules \
    && mv hop /root/node_modules

COPY hoprc.hop /root/.config/hop/hoprc.hop

RUN rm -rf /tmp/*

ENTRYPOINT ["/usr/local/bin/hop"]
