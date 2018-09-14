The `Dockerfile` is to be used to build a complete HipHop Docker image.
It should be used as:

```shell
$ docker build -f Dockerfile -t hop .
```

If you already have installed Hop or HipHop within docker, you might
find useful to remove the old image first. This can be achieved with:

```shell
$ docker container prune
$ docker rmi `docker images | grep hop | awk '{print $3}'`
```

How to complete the HipHop docker image installation and how to run it
is similar to the Hop installation. The documentation is to be found at
[hop](http://hop-dev.inria.fr/home/download.html).
