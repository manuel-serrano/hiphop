FROM debian:jessie

RUN apt-get clean && apt-get update && apt-get install -y \
    make \
    wget \
    git \
    gcc \
    autoconf \
    libgmp-dev \
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

RUN wget http://www-sop.inria.fr/members/Colin.Vidal/bigloo4.3b-last.tar.gz \
    && tar -xzf bigloo*.tar.gz && cd bigloo* \
    && ./configure && make -j$(nproc) && make install

RUN wget http://www-sop.inria.fr/members/Colin.Vidal/hop-3.1.0-pre1.tar.gz \
    && tar -xzf hop* && cd hop* \
    && ./configure && make -j$(nproc) && make install

RUN git clone https://github.com/colinvidal/hiphop.git \
    && mkdir /root/.node_modules \
    && mv hiphop /root/.node_modules/

COPY hoprc.hop /root/.config/hop/hoprc.hop

RUN rm -rf /tmp/*

ENTRYPOINT ["/usr/local/bin/hop"]
