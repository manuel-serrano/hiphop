HipHop.js Debian Package - 14 april 2020
========================================

This document explains how to use the `makedeb.sh' script to
build the HipHop.js Debian packages.

This script install the HipHop.js version out of a tarball stored in:

   $HOME/prgm/project/hop/repository

It uses the currently "configured" HipHop.js version.


1. Prerequisite
---------------

Install the Debian development toolchain and the Bigloo dependencies
on the host. In particular

  sudo apt -qq update
  sudo apt install -y dh-make libssl1.1 libssl-dev libsqlite3-0 libsqlite3-dev
  sudo apt install -y libasound2-dev libflac-dev libmpg123-dev libavahi-core-dev
  sudo apt install -y libavahi-common-dev libavahi-client-dev libpulse-dev
  sudo apt install -y libgmp-dev automake libtool
  
Bigloo and Hop packages must be installed too. These versions must be used
to build the HipHop.js package

1.1 If bigloo and Hop are not in the /etc/apt/source.list

  sudo dpkg -i bigloo_4.3h-1_amd64.deb
  sudo dpkg -i bigloo-libs_4.3h-1_amd64.deb
  sudo dpkg -i libmultimedia-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libalsa-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libavahi-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libflac-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libgstreamer-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libmpg123-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libpulseaudio-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libsqlite-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libssl-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i libwav-bigloo_4.3h-1_amd64.deb
  sudo dpkg -i hop_3.3.0-1_amd64.deb

1.2 If the hop repository is in /etc/apt/source.list

  sudo apt install bigloo bigloo-libs libalsa-bigloo libavahi-bigloo 
  sudo apt install libmultimedia-bigloo libflac-bigloo libgstreamer-bigloo 
  sudo apt install libmpg123-bigloo libpulseaudio-bigloo libsqlite-bigloo 
  sudo apt install libssl-bigloo libwav-bigloo hop


2. To build the debian packages on the local machine
----------------------------------------------------
  
  ./makedeb.sh [-O targetdir] [--repodir dir]
  
example:

  ./makedeb.sh -O /tmp/debhiphop

