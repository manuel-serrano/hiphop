This example shows how to orchestrate Android device events using
HipHop.js program and the Hop.js `hopdroid` module.

This example can be _emulated_ on a development machine but it it mostly
intented to illustrate how to build an Android application with HipHop.js

To run it on the emulator, executed `hop hhdroid.js` and browse the two URL
(in that order) `localhost:/hop/hhdroid` and `/hop/hopdroid/simulator`.

Building and installing Android applications has pre-requesites described
in the Hop.js documentation [Android](25-android.html). Once the Android
developmenent tools are operational, this example can be build with:

```shell
make
```

This will generate the Android package 
`/tmp/build.hhdroid-1.0.0.android/hhdroid-1.0.0.apk` (replace `1.0.0` with
current version number of `arch/andoird/Makefile.conf`. To install it on
a device:

```shell
adb install /tmp/build.hhdroid-1.0.0.android/hhdroid-1.0.0.apk
```

Then open the application on device as usual.

