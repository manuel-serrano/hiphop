FROM hop

WORKDIR /tmp

STOPSIGNAL SIGINT

USER root

RUN git clone https://github.com/manuel-serrano/hiphop.git \
    && (cd hiphop; git checkout master; ./configure && make && sudo make install)

USER hop
ENV HOME /home/hop

ENTRYPOINT ["/bin/bash"]
ENTRYPOINT ["/usr/local/bin/hop"]

