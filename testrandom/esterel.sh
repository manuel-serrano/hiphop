#!/bin/sh
#*=====================================================================*/
#*    serrano/prgm/project/hiphop/hiphop/testrandom/esterel.sh         */
#*    -------------------------------------------------------------    */
#*    Author      :  manuel serrano                                    */
#*    Creation    :  Fri Nov 21 13:42:15 2025                          */
#*    Last change :  Sat Nov 22 06:43:04 2025 (serrano)                */
#*    Copyright   :  2025 manuel serrano                               */
#*    -------------------------------------------------------------    */
#*    Compile Esterel programs                                         */
#*=====================================================================*/

srcfile=$1
infile=$2

src=`basename $srcfile .strl`
srcdir=`dirname $1`
ccdir=`dirname $0` || "."

ESTEREL_HOME=${HIPHOP_RT_ESTEREL_HOME:-/opt/esterel/esterelv5_100}
ESTEREL_COMP=${HIPHOP_RT_ESTEREL_COMP:-$ESTEREL_HOME/esterelv5_100.linux-x86-64/bin/esterel}
ESTEREL_LIB=${HIPHOP_RT_ESTEREL_LIB:-$ESTEREL_HOME/coresim/libcoresim.a}

$ESTEREL_COMP -I -simul $1 2> /tmp/esterel.log

if [ "$?" != "0" ]; then
  cat /tmp/esterel.log
  rm /tmp/esterel.log
  exit 1
else
  rm /tmp/esterel.log
fi

gcc ${src}.c $ESTEREL_LIB -o ${srcdir}/${src} || exit 2

${srcdir}/${src} < ${infile} 2> /dev/null | $ccdir/esterel-simparse.mjs
