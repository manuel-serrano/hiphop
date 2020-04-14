FROM hop

WORKDIR /tmp

STOPSIGNAL SIGINT

USER root

RUN git clone https://github.com/manuel-serrano/hiphop.git \
    && (cd hiphop; git checkout master; cd doc; make ) \
    && (cp -r hiphop/doc /usr/local/share/doc/hiphop) \
    && mv hiphop /usr/local/lib/hop/3.3.0/node_modules \
    && chmod a+rx -R /usr/local/lib/hop/3.3.0/node_modules \
    && chmod a+rx -R /usr/local/share/doc/hiphop

USER hop
ENV HOME /home/hop

ENTRYPOINT ["/bin/bash"]
ENTRYPOINT ["/usr/local/bin/hop"]

