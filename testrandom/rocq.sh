#!/bin/sh
#*=====================================================================*/
#*    serrano/prgm/project/hiphop/hiphop/testrandom/rocq.sh            */
#*    -------------------------------------------------------------    */
#*    Author      :  manuel serrano                                    */
#*    Creation    :  Fri Nov 21 13:42:15 2025                          */
#*    Last change :  Thu Apr  9 07:41:09 2026 (serrano)                */
#*    Copyright   :  2025-26 manuel serrano                            */
#*    -------------------------------------------------------------    */
#*    Execute rocq programs                                            */
#*=====================================================================*/

ROCQ_HOME=${HIPHOP_RT_ROCQ_HOME:-$HOME/prgm/project/hiphop/work/esterel-coq/ESTEREL}
ROCQ_DUNE=${HIPHOP_RT_ROCQ_DUNE:-$HOME/.opam/default/bin/dune}

srcfile=$1
tmp=rocq.hh.json

cwd=$PWD

case "$srcfile" in
  /*) 
    src=$srcfile
    ;;
  *) 
    src="$cwd/$srcfile"
    ;;
esac

trap "cd $cwd" EXIT

cd $ROCQ_HOME

eval $(opam env)

cp $src $tmp

case $2 in
  "")
    opt=""
    ;;
  constructive)
    opt="--semantics constructive"
    ;;
  *)
    echo "Illegal option \"$2\""
esac

$ROCQ_DUNE exec ./esterelcoq.exe -- $opt $tmp 2> err-$tmp && cat out-$tmp | sed '/s/"env"/"signals"/'

