HipHop Android Example
======================

_23 Jan 2022_

This example shows how to orchestrate Android device events using
HipHop.js and using the Hop.js `hopdroid` module.

This example can be _emulated_ on a development machine (e.g., a
laptop or a desktop) but it is intented to run on a real device. This
example illustrates how to build an Android application with HipHop.js

To run it on the emulator, execute `hop hhdroid.js` and browse the two URL
(in that order, because the simulator automatically connects to the last
emulated phone created).

   1. `localhost:8080/hop/hhdroid` 
   2. `localhost:8080/hop/hopdroid/simulator`
   
The simulator page is only used to send fake event to the emulated phone.

Building and installing Android applications have pre-requesites described
in the Hop.js documentation [Android](25-android.html). Once the Android
developmenent tools are operational, this example can be build with:

```shell
make
```

This will generate the Android package 
`/tmp/build.hhdroid-1.0.0.android/hhdroid-1.0.0.apk` (replace `1.0.0` with
current version number of `arch/android/Makefile.conf`. To install it on
a device:

```shell
adb install /tmp/build.hhdroid-1.0.0.android/hhdroid-1.0.0.apk
```

Then open the application on the device as usual.

