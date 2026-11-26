// Regression test found by the random tester (testrandom, maxSize 20),
// shrunk by the tester.
//
// The program is not constructive: the first reaction raises a
// causality error. Without cycle removal the error is reported
// normally. With the cycle removal (uncycle or uncyclesat), the
// circuit contains many unrolled copies of the cycle and is very
// deep, and the recursive cycleSize function of lib/causality.js,
// which the causality error handler calls to build its report,
// overflows the stack ("RangeError: Maximum call stack size
// exceeded") instead of reporting the causality error.
//
// Any error other than the causality error is printed, so that the
// test fails on the stack overflow.
import * as hh from "@hop/hiphop";

const events = [{"g47873":4,"g47872":64},{"g47872":41,"g47874":19,"g47873":44},{"g47873":96,"g47874":71,"g47872":45},null,{"g47872":72,"g47875":58,"g47873":94,"g47874":43},{"g47873":58,"g47872":15},{"g47872":67},{"g47875":24,"g47873":81,"g47872":39,"g47874":89}];

const prg = hiphop module() {
  inout g47872 = 10 combine (x, y) => (x + y), g47873 = 10 combine (x, y) => (x + y), g47874 = 10 combine (x, y) => (x + y), g47875 = 10 combine (x, y) => (x + y);
  if (!(g47872.pre && g47873.now)) {
    fork {
      if (!g47875.pre) {
        fork {
          {
            pragma { (((this.g47872.nowval !== 0) || (this.g47874.nowval !== 0)) && ((this.g47875.nowval !== 0) || (this.g47875.nowval !== 0))); }
            trap47884: {
              {
                {
                  {
                    emit g47874(15);
                    if (!((this.g47874.nowval !== 0) || (this.g47874.preval !== 0))) {
                      trap47885: {
                        {
                          yield;
                          {
                            yield;
                            fork {
                              yield;
                            } par {
                              pragma { (this.g47873.nowval !== 0); }
                            } par {
                              {
                                ;
                                yield;
                              }
                            }
                          }
                        }
                      }
                      yield;
                    } else {
                      if ((g47872.now || g47873.now)) {
                        if ((g47873.now || g47875.pre)) {
                          yield;
                        } else {
                          ;
                        }
                      } else {
                        pragma { ((this.g47875.preval !== 0) && (this.g47873.nowval !== 0)); }
                        emit g47874(97);
                      }
                      {
                        signal g47886 = 11 combine (x, y) => (x + y), g47887 = 11 combine (x, y) => (x + y), g47888 = 11 combine (x, y) => (x + y), g47889 = 11 combine (x, y) => (x + y);
                        {
                          emit g47875(59);
                          emit g47873(44);
                        }
                      }
                    }
                  }
                  emit g47873(62);
                }
                if (!(this.g47873.preval !== 0)) {
                  pragma { (((this.g47873.nowval !== 0) || (this.g47874.preval !== 0)) && ((this.g47872.nowval !== 0) || (this.g47874.nowval !== 0))); }
                } else {
                  ;
                }
              }
            }
          }
        } par {
          if (((this.g47875.nowval !== 0) || (this.g47873.nowval !== 0))) {
            {
              loop {
                yield;
              }
              if ((!g47875.pre || g47872.pre)) {
                if ((this.g47874.preval !== 0)) {
                  yield;
                } else {
                  yield;
                }
                {
                  {
                    pragma { (((this.g47874.preval !== 0) && (this.g47875.preval !== 0)) || ((this.g47873.nowval !== 0) || (this.g47874.nowval !== 0))); }
                    {
                      ;
                      fork {
                        pragma { ((this.g47875.nowval !== 0) && (this.g47875.preval !== 0)); }
                      } par {
                        if ((((this.g47873.preval !== 0) || (this.g47873.preval !== 0)) || !(this.g47875.preval !== 0))) {
                          pragma { ((this.g47873.nowval !== 0) || (this.g47875.nowval !== 0)); }
                        } else {
                          ;
                        }
                      }
                    }
                  }
                  emit g47874(10);
                }
              } else {
                {
                  signal g47890 = 11 combine (x, y) => (x + y), g47891 = 11 combine (x, y) => (x + y);
                  {
                    pragma { (this.g47891.nowval !== 0); }
                    fork {
                      if (((this.g47874.nowval !== 0) || (this.g47873.preval !== 0))) {
                        fork {
                          if ((!g47874.now && g47874.pre)) {
                            emit g47890(80);
                          } else {
                            pragma { !(this.g47891.preval !== 0); }
                          }
                        }
                      } else {
                        ;
                        emit g47872(60);
                      }
                    } par {
                      if ((g47873.pre || g47873.now)) {
                        emit g47873(2);
                      } else {
                        emit g47874(16);
                      }
                    } par {
                      {
                        yield;
                        ;
                      }
                    } par {
                      {
                        yield;
                        emit g47873(58);
                      }
                    } par {
                      {
                        emit g47875(48);
                        {
                          yield;
                          emit g47875(96);
                        }
                      }
                    }
                  }
                }
              }
            }
            {
              yield;
              fork {
                {
                  yield;
                  emit g47873(47);
                }
              }
            }
          } else {
            if ((!g47872.now && g47875.pre)) {
              emit g47873(100);
            } else {
              emit g47872(28);
            }
            if ((g47875.now && g47875.now)) {
              fork {
                emit g47875(56);
              } par {
                ;
              } par {
                {
                  ;
                  pragma { (((this.g47875.preval !== 0) && (this.g47875.preval !== 0)) || ((this.g47875.nowval !== 0) || (this.g47872.nowval !== 0))); }
                }
              }
              {
                {
                  emit g47874(28);
                  fork {
                    ;
                  } par {
                    if (((this.g47875.preval !== 0) && (this.g47875.nowval !== 0))) {
                      pragma { (this.g47875.nowval !== 0); }
                    } else {
                      ;
                    }
                  }
                }
                {
                  signal g47892 = 11 combine (x, y) => (x + y), g47893 = 11 combine (x, y) => (x + y), g47894 = 11 combine (x, y) => (x + y);
                  if ((g47873.pre && g47875.pre)) {
                    pragma { (!(this.g47873.nowval !== 0) && ((this.g47872.nowval !== 0) && (this.g47874.nowval !== 0))); }
                    emit g47872(5);
                  } else {
                    if ((!g47873.now && g47874.now)) {
                      yield;
                    } else {
                      pragma { !(this.g47873.nowval !== 0); }
                    }
                  }
                }
              }
            } else {
              if (((g47872.now && g47875.now) && (g47873.now || !g47872.now))) {
                if (!g47874.now) {
                  yield;
                  trap47895: {
                    ;
                  }
                } else {
                  trap47896: {
                    fork {
                      ;
                    }
                  }
                }
                {
                  fork {
                    ;
                  }
                  {
                    pragma { ((this.g47873.preval !== 0) || (this.g47872.nowval !== 0)); }
                    fork {
                      emit g47872(49);
                    } par {
                      {
                        yield;
                        yield;
                      }
                    }
                  }
                }
              } else {
                loop {
                  fork {
                    {
                      signal g47897 = 11 combine (x, y) => (x + y), g47898 = 11 combine (x, y) => (x + y), g47899 = 11 combine (x, y) => (x + y);
                      yield;
                    }
                  } par {
                    pragma { (this.g47873.nowval !== 0); }
                  } par {
                    if (((this.g47873.nowval !== 0) || (this.g47873.preval !== 0))) {
                      yield;
                    } else {
                      yield;
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        fork {
          {
            if ((((this.g47874.preval !== 0) || (this.g47874.nowval !== 0)) || ((this.g47872.preval !== 0) || (this.g47873.preval !== 0)))) {
              if ((g47875.pre && g47875.now)) {
                emit g47873(71);
                pragma { (this.g47873.nowval !== 0); }
              } else {
                {
                  signal g47900 = 11 combine (x, y) => (x + y), g47901 = 11 combine (x, y) => (x + y);
                  ;
                }
              }
              loop {
                {
                  {
                    {
                      signal g47902 = 11 combine (x, y) => (x + y), g47903 = 11 combine (x, y) => (x + y);
                      {
                        emit g47872(61);
                        emit g47903(66);
                      }
                    }
                    emit g47874(76);
                  }
                  yield;
                }
              }
            } else {
              loop {
                fork {
                  {
                    {
                      signal g47904 = 11 combine (x, y) => (x + y), g47905 = 11 combine (x, y) => (x + y), g47906 = 11 combine (x, y) => (x + y), g47907 = 11 combine (x, y) => (x + y);
                      {
                        emit g47872(7);
                        if ((!(g47906.now || !g47872.now) && (g47873.now && g47872.now))) {
                          if (((!g47875.now || g47873.now) || (g47905.now && g47872.now))) {
                            if (!((g47875.now || g47907.pre) || (!g47875.pre || g47874.pre))) {
                              loop {
                                {
                                  pragma { (!(this.g47875.nowval !== 0) || !(this.g47905.preval !== 0)); }
                                  yield;
                                }
                              }
                            } else {
                              if ((!g47874.now || g47873.now)) {
                                emit g47875(30);
                              } else {
                                emit g47872(40);
                              }
                            }
                          } else {
                            fork {
                              yield;
                            } par {
                              fork {
                                emit g47875(57);
                              } par {
                                pragma { (this.g47873.preval !== 0); }
                              } par {
                                ;
                              } par {
                                ;
                              } par {
                                if ((((this.g47872.nowval !== 0) && (this.g47872.preval !== 0)) && !(this.g47875.preval !== 0))) {
                                  yield;
                                } else {
                                  emit g47906(55);
                                }
                              }
                            }
                          }
                        } else {
                          if ((g47874.pre && g47875.pre)) {
                            if (((g47874.now && g47875.now) || !(g47872.pre && g47872.now))) {
                              pragma { (this.g47905.nowval !== 0); }
                              yield;
                            } else {
                              fork {
                                ;
                              }
                            }
                          } else {
                            emit g47906(68);
                            if (g47875.pre) {
                              pragma { ((this.g47906.nowval !== 0) && (this.g47872.nowval !== 0)); }
                            } else {
                              yield;
                            }
                          }
                        }
                      }
                    }
                    yield;
                  }
                }
              }
            }
            {
              fork {
                emit g47874(15);
              } par {
                {
                  emit g47872(36);
                  emit g47873(11);
                }
              }
              fork {
                yield;
              } par {
                ;
              } par {
                if ((g47872.now && !g47874.now)) {
                  pragma { ((this.g47873.nowval !== 0) && (this.g47872.preval !== 0)); }
                } else {
                  yield;
                }
              }
            }
          }
        }
      }
    } par {
      {
        {
          signal g47908 = 11 combine (x, y) => (x + y), g47909 = 11 combine (x, y) => (x + y);
          if (((this.g47873.preval !== 0) || (this.g47874.nowval !== 0))) {
            if (((this.g47872.nowval !== 0) && (this.g47909.preval !== 0))) {
              fork {
                {
                  {
                    signal g47910 = 11 combine (x, y) => (x + y), g47911 = 11 combine (x, y) => (x + y), g47912 = 11 combine (x, y) => (x + y), g47913 = 11 combine (x, y) => (x + y);
                    {
                      ;
                      emit g47873(10);
                    }
                  }
                  if (((this.g47875.nowval !== 0) && (this.g47875.preval !== 0))) {
                    ;
                  } else {
                    emit g47872(39);
                  }
                }
              } par {
                emit g47873(22);
              } par {
                {
                  pragma { ((this.g47875.nowval !== 0) || (this.g47873.nowval !== 0)); }
                  pragma { (((this.g47874.nowval !== 0) || (this.g47872.preval !== 0)) && ((this.g47873.preval !== 0) || (this.g47909.preval !== 0))); }
                }
              }
            } else {
              fork {
                ;
              }
            }
          } else {
            fork {
              {
                if ((g47875.pre && g47874.now)) {
                  ;
                } else {
                  pragma { ((this.g47872.nowval !== 0) && (this.g47909.preval !== 0)); }
                }
                yield;
              }
            } par {
              pragma { ((this.g47872.preval !== 0) || (this.g47872.nowval !== 0)); }
            } par {
              emit g47872(27);
            } par {
              if ((g47873.now || g47874.now)) {
                emit g47875(92);
              } else {
                yield;
              }
            }
          }
        }
        if (!(g47875.now || g47873.now)) {
          yield;
        } else {
          yield;
        }
      }
    } par {
      {
        fork {
          ;
        } par {
          {
            emit g47873(72);
            ;
          }
        }
        fork {
          {
            ;
            {
              fork {
                emit g47874(36);
              } par {
                emit g47875(79);
              } par {
                {
                  yield;
                  yield;
                }
              }
              pragma { (((this.g47873.nowval !== 0) && (this.g47874.nowval !== 0)) || ((this.g47874.nowval !== 0) && (this.g47873.nowval !== 0))); }
            }
          }
        } par {
          ;
        } par {
          ;
        } par {
          ;
        } par {
          if (((!g47872.now && g47875.now) || (g47873.now || g47875.now))) {
            emit g47873(74);
          } else {
            emit g47872(38);
          }
        }
      }
    } par {
      fork {
        trap47914: {
          if ((((this.g47873.nowval !== 0) && (this.g47875.nowval !== 0)) && ((this.g47875.preval !== 0) && (this.g47872.nowval !== 0)))) {
            {
              pragma { ((this.g47873.nowval !== 0) || (this.g47874.preval !== 0)); }
              {
                ;
                pragma { ((this.g47873.nowval !== 0) || (this.g47874.preval !== 0)); }
              }
            }
            fork {
              ;
            } par {
              pragma { ((this.g47873.preval !== 0) && (this.g47874.preval !== 0)); }
            } par {
              ;
            } par {
              fork {
                if ((!g47872.now || !g47875.now)) {
                  yield;
                } else {
                  yield;
                }
              }
            }
          } else {
            yield;
            if ((g47874.pre && g47873.now)) {
              {
                emit g47872(28);
                ;
              }
              ;
            } else {
              loop {
                fork {
                  break trap47914;
                } par {
                  ;
                } par {
                  emit g47874(78);
                } par {
                  emit g47875(80);
                } par {
                  trap47915: {
                    ;
                  }
                }
              }
            }
          }
        }
      } par {
        {
          signal g47916 = 11 combine (x, y) => (x + y), g47917 = 11 combine (x, y) => (x + y), g47918 = 11 combine (x, y) => (x + y), g47919 = 11 combine (x, y) => (x + y);
          {
            emit g47872(88);
            pragma { ((this.g47873.nowval !== 0) && (this.g47918.preval !== 0)); }
          }
        }
      } par {
        {
          {
            signal g47920 = 11 combine (x, y) => (x + y), g47921 = 11 combine (x, y) => (x + y), g47922 = 11 combine (x, y) => (x + y), g47923 = 11 combine (x, y) => (x + y), g47924 = 11 combine (x, y) => (x + y);
            fork {
              yield;
            } par {
              yield;
            } par {
              {
                signal g47925 = 11 combine (x, y) => (x + y), g47926 = 11 combine (x, y) => (x + y), g47927 = 11 combine (x, y) => (x + y), g47928 = 11 combine (x, y) => (x + y);
                emit g47875(35);
              }
            }
          }
          ;
        }
      }
    }
    emit g47874(81);
  } else {
    if (((g47874.pre || g47872.now) && !(g47872.now && g47875.now))) {
      if ((!g47872.now || g47873.pre)) {
        if ((g47873.pre || !g47873.pre)) {
          if (g47873.pre) {
            fork {
              emit g47873(3);
            } par {
              {
                yield;
                yield;
              }
            }
            {
              {
                signal g47929 = 11 combine (x, y) => (x + y), g47930 = 11 combine (x, y) => (x + y);
                {
                  yield;
                  {
                    if (g47872.pre) {
                      yield;
                      ;
                    } else {
                      yield;
                      pragma { !(this.g47874.preval !== 0); }
                    }
                    {
                      ;
                      if (g47875.pre) {
                        pragma { ((this.g47874.nowval !== 0) || (this.g47874.nowval !== 0)); }
                      } else {
                        pragma { (this.g47875.nowval !== 0); }
                      }
                    }
                  }
                }
              }
              pragma { !(this.g47875.nowval !== 0); }
            }
          } else {
            fork {
              {
                trap47931: {
                  {
                    {
                      {
                        yield;
                        ;
                      }
                      {
                        pragma { (((this.g47872.nowval !== 0) && (this.g47875.preval !== 0)) || ((this.g47874.nowval !== 0) || (this.g47875.nowval !== 0))); }
                        yield;
                      }
                    }
                    trap47932: {
                      {
                        pragma { !((this.g47873.nowval !== 0) && (this.g47874.preval !== 0)); }
                        yield;
                      }
                    }
                  }
                }
                {
                  yield;
                  {
                    {
                      pragma { (((this.g47873.nowval !== 0) || (this.g47872.preval !== 0)) && ((this.g47873.nowval !== 0) && (this.g47875.nowval !== 0))); }
                      emit g47874(60);
                    }
                    emit g47875(88);
                  }
                }
              }
            } par {
              if ((g47872.now && g47875.pre)) {
                fork {
                  if (!(!g47873.pre && g47873.pre)) {
                    fork {
                      fork {
                        fork {
                          {
                            emit g47874(72);
                            yield;
                          }
                        } par {
                          emit g47875(63);
                        } par {
                          yield;
                        } par {
                          pragma { ((this.g47875.nowval !== 0) && (this.g47874.nowval !== 0)); }
                        } par {
                          {
                            emit g47872(1);
                            ;
                          }
                        }
                      } par {
                        {
                          pragma { (this.g47872.preval !== 0); }
                          emit g47872(79);
                        }
                      } par {
                        ;
                      } par {
                        pragma { !(this.g47875.preval !== 0); }
                      } par {
                        trap47933: {
                          yield;
                        }
                      }
                    }
                  } else {
                    yield;
                    {
                      {
                        {
                          signal g47934 = 11 combine (x, y) => (x + y), g47935 = 11 combine (x, y) => (x + y), g47936 = 11 combine (x, y) => (x + y);
                          yield;
                        }
                        {
                          if ((g47872.now && !g47875.now)) {
                            pragma { (!(this.g47874.nowval !== 0) || ((this.g47873.preval !== 0) && (this.g47872.nowval !== 0))); }
                          } else {
                            ;
                          }
                          {
                            ;
                            yield;
                          }
                        }
                      }
                      {
                        signal g47937 = 11 combine (x, y) => (x + y), g47938 = 11 combine (x, y) => (x + y), g47939 = 11 combine (x, y) => (x + y), g47940 = 11 combine (x, y) => (x + y);
                        {
                          yield;
                          {
                            yield;
                            emit g47939(32);
                          }
                        }
                      }
                    }
                  }
                }
              } else {
                fork {
                  {
                    if (((this.g47875.preval !== 0) || (this.g47875.preval !== 0))) {
                      if ((!(!g47873.now || !g47873.pre) && (g47874.pre && !g47875.now))) {
                        emit g47872(56);
                      } else {
                        yield;
                      }
                      fork {
                        ;
                      } par {
                        yield;
                      } par {
                        emit g47874(43);
                      } par {
                        yield;
                      } par {
                        {
                          emit g47872(72);
                          pragma { (this.g47872.nowval !== 0); }
                        }
                      }
                    } else {
                      if ((!g47875.now || g47874.pre)) {
                        if ((g47874.pre && g47874.now)) {
                          if ((g47873.pre && !g47873.now)) {
                            pragma { (((this.g47873.nowval !== 0) && (this.g47872.nowval !== 0)) && ((this.g47875.preval !== 0) && (this.g47872.nowval !== 0))); }
                          } else {
                            yield;
                          }
                        } else {
                          emit g47874(18);
                          emit g47872(92);
                        }
                      } else {
                        if (((this.g47873.preval !== 0) || (this.g47873.preval !== 0))) {
                          {
                            signal g47941 = 11 combine (x, y) => (x + y), g47942 = 11 combine (x, y) => (x + y), g47943 = 11 combine (x, y) => (x + y), g47944 = 11 combine (x, y) => (x + y);
                            yield;
                          }
                        } else {
                          yield;
                          emit g47875(68);
                        }
                      }
                    }
                    {
                      if (g47875.pre) {
                        ;
                      } else {
                        emit g47872(69);
                      }
                      yield;
                    }
                  }
                } par {
                  {
                    emit g47875(71);
                    fork {
                      emit g47874(2);
                    } par {
                      yield;
                    } par {
                      yield;
                    } par {
                      yield;
                    } par {
                      {
                        signal g47945 = 11 combine (x, y) => (x + y), g47946 = 11 combine (x, y) => (x + y), g47947 = 11 combine (x, y) => (x + y);
                        emit g47945(10);
                      }
                    }
                  }
                } par {
                  {
                    yield;
                    {
                      yield;
                      {
                        emit g47873(73);
                        ;
                      }
                    }
                  }
                }
              }
            }
          }
        } else {
          loop {
            {
              signal g47948 = 11 combine (x, y) => (x + y), g47949 = 11 combine (x, y) => (x + y), g47950 = 11 combine (x, y) => (x + y), g47951 = 11 combine (x, y) => (x + y);
              {
                signal g47952 = 11 combine (x, y) => (x + y), g47953 = 11 combine (x, y) => (x + y);
                {
                  signal g47954 = 11 combine (x, y) => (x + y), g47955 = 11 combine (x, y) => (x + y);
                  yield;
                }
              }
            }
          }
          {
            {
              signal g47956 = 11 combine (x, y) => (x + y), g47957 = 11 combine (x, y) => (x + y), g47958 = 11 combine (x, y) => (x + y), g47959 = 11 combine (x, y) => (x + y);
              emit g47872(54);
            }
            {
              if (!((g47873.now || !g47874.pre) && (g47874.pre && g47874.now))) {
                {
                  signal g47960 = 11 combine (x, y) => (x + y), g47961 = 11 combine (x, y) => (x + y);
                  {
                    yield;
                    yield;
                  }
                }
              } else {
                {
                  emit g47873(100);
                  emit g47872(80);
                }
                emit g47872(92);
              }
              if (((g47873.pre && g47874.now) || (g47874.now && g47874.now))) {
                trap47962: {
                  {
                    pragma { (((this.g47873.nowval !== 0) && (this.g47872.preval !== 0)) || ((this.g47874.nowval !== 0) || (this.g47874.preval !== 0))); }
                    fork {
                      if (!g47875.pre) {
                        yield;
                      } else {
                        emit g47873(92);
                      }
                    }
                  }
                }
              } else {
                if ((g47874.pre && g47872.now)) {
                  fork {
                    emit g47875(60);
                  } par {
                    fork {
                      {
                        yield;
                        pragma { (!(this.g47873.preval !== 0) && ((this.g47873.preval !== 0) && (this.g47875.preval !== 0))); }
                      }
                    }
                  }
                  yield;
                } else {
                  fork {
                    ;
                  } par {
                    {
                      pragma { ((this.g47874.preval !== 0) && (this.g47875.preval !== 0)); }
                      yield;
                    }
                  }
                  pragma { ((this.g47872.preval !== 0) && (this.g47872.nowval !== 0)); }
                }
              }
            }
          }
        }
      } else {
        {
          signal g47963 = 11 combine (x, y) => (x + y), g47964 = 11 combine (x, y) => (x + y), g47965 = 11 combine (x, y) => (x + y);
          {
            trap47966: {
              if (!g47965.now) {
                {
                  signal g47967 = 11 combine (x, y) => (x + y), g47968 = 11 combine (x, y) => (x + y), g47969 = 11 combine (x, y) => (x + y);
                  trap47970: {
                    {
                      if (!(this.g47875.nowval !== 0)) {
                        pragma { ((this.g47963.preval !== 0) || (this.g47964.preval !== 0)); }
                      } else {
                        break trap47966;
                      }
                      ;
                    }
                  }
                }
              } else {
                {
                  ;
                  {
                    ;
                    yield;
                  }
                }
                {
                  yield;
                  yield;
                }
              }
            }
            if (((g47875.now && g47964.now) && (g47965.pre && !g47875.pre))) {
              if ((this.g47874.nowval !== 0)) {
                if (((this.g47873.nowval !== 0) && (this.g47874.nowval !== 0))) {
                  ;
                  ;
                } else {
                  fork {
                    pragma { (this.g47874.preval !== 0); }
                  } par {
                    yield;
                  } par {
                    fork {
                      {
                        yield;
                        yield;
                      }
                    }
                  }
                }
                {
                  yield;
                  yield;
                }
              } else {
                fork {
                  if ((g47873.now && g47963.now)) {
                    if (((this.g47963.nowval !== 0) && (this.g47874.nowval !== 0))) {
                      yield;
                    } else {
                      yield;
                    }
                  } else {
                    emit g47964(20);
                    emit g47873(65);
                  }
                } par {
                  yield;
                } par {
                  yield;
                } par {
                  ;
                } par {
                  trap47971: {
                    pragma { (((this.g47875.nowval !== 0) || (this.g47873.preval !== 0)) && ((this.g47874.nowval !== 0) && (this.g47874.preval !== 0))); }
                  }
                }
              }
            } else {
              if ((!g47874.now || g47874.now)) {
                if (((this.g47872.preval !== 0) && (this.g47872.nowval !== 0))) {
                  pragma { !!(this.g47874.nowval !== 0); }
                } else {
                  ;
                }
                {
                  ;
                  emit g47873(31);
                }
              } else {
                {
                  emit g47874(63);
                  {
                    emit g47873(28);
                    emit g47964(31);
                  }
                }
                emit g47963(47);
              }
              ;
            }
          }
        }
        {
          emit g47874(95);
          yield;
        }
      }
    } else {
      fork {
        yield;
      } par {
        ;
      } par {
        pragma { (this.g47875.nowval !== 0); }
      } par {
        fork {
          ;
        }
      }
    }
  }
}

export const mach = new hh.ReactiveMachine(prg, { name: "uncycle-causality-report", verbose: -1 });
mach.outbuf = "";

try {
   events.forEach(e => mach.outbuf += JSON.stringify(mach.react(e)) + "\n");
} catch (e) {
   if (e.message === "Causality error.") {
      mach.outbuf += "*** CAUSALITY ERROR\n";
   } else {
      mach.outbuf += `*** UNEXPECTED ERROR: ${e.constructor.name}: ${e.message}\n`;
   }
}
