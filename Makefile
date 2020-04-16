#* Generated file, don't edit
#*=====================================================================*/
#*    serrano/prgm/project/hiphop/hiphop/Makefile.in                   */
#*    -------------------------------------------------------------    */
#*    Author      :  Manuel Serrano                                    */
#*    Creation    :  Fri Jan 20 14:35:57 2006                          */
#*    Last change :  Thu Apr 16 12:19:24 2020 (serrano)                */
#*    Copyright   :  2006-20 Manuel Serrano                            */
#*    -------------------------------------------------------------    */
#*    Generic Makefile to build Hop weblets.                           */
#*=====================================================================*/
## run "make" to build the .hz file

-include @BGLPATH@/Makefile.config
-include @HOPPATH@/Makefile.hopconfig

#*---------------------------------------------------------------------*/
#*    Weblet description                                               */
#*---------------------------------------------------------------------*/
HZ=hiphop
HZVERSION=0.3.0
DATE="16 April 2020"

CATEGORY=programming
LICENSE=gpl

HOPREPOSITORY=/home/serrano/prgm/distrib
HOPLIBDIR=/usr/local/lib
HOPVERSION=3.3.0
HOPBUILDID=5adf856854ec1a4323b1883c900fe01b
HOPBUILDARCH=linux-x86_64

HOP = hop
HOPC = /usr/local/lib/hop/3.3.0/node_modules/hopc/lib/so/3.3.0/5adf856854ec1a4323b1883c900fe01b/linux-x86_64/hopc.so
HFLAGS = -O2

HOPCOMPOPTS = -v2 --no-server --so-policy aot --so-target src -q

NODE_MODULES=$(HOPLIBDIR)/hop/$(HOPVERSION)/node_modules
LOCAL_NODE_MODULES=$$HOME/.node_modules

#*---------------------------------------------------------------------*/
#*    targets                                                          */
#*---------------------------------------------------------------------*/
so: ChangeLog
	HOPTRACE="nodejs:compile" NODE_PATH=$$PWD $(HOP) $(HOPCOMPOPTS) -j 'require("./lib/hiphop.js")'

#*---------------------------------------------------------------------*/
#*    install                                                          */
#*---------------------------------------------------------------------*/
.PHONY: install-dir install install-local

install:
	$(MAKE) install-dir TARGET_DIR=$(DESTDIR)$(NODE_MODULES)

install-local:
	$(MAKE) install-dir TARGET_DIR=$(LOCAL_NODE_MODULES)

install-dir:
	mkdir -p $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	cp -rf package.json $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	cp -rf package-lock.json $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	cp -rf node_modules $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	cp -rf ulib $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	cp -rf lib $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	cp -rf preprocessor $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	cp -rf so $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	chmod a+rx -R $(TARGET_DIR)/$(HZ)-$(HZVERSION)
	rm -f $(TARGET_DIR)/$(HZ)
	(cd $(TARGET_DIR); ln -s $(HZ)-$(HZVERSION) $(HZ))

#*---------------------------------------------------------------------*/
#*    clean                                                            */
#*---------------------------------------------------------------------*/
clean:
	rm -rf so
	rm -rf lib/so
	rm -rf ulib/so
	rm -rf preprocessor/so

cleanall: clean
	rm -f config.status
	rm -f lib/config.js
	rm -rf arch/debian/debian

distclean: cleanall

#*---------------------------------------------------------------------*/
#*    hz                                                               */
#*---------------------------------------------------------------------*/
.PHONY: distrib hz

distrib: hz
hz: $(HOPREPOSITORY)/$(HZ)-$(HZVERSION).hz

$(HOPREPOSITORY)/$(HZ)-$(HZVERSION).hz: \
  package.json \
  package-lock.json \
  node_modules \
  ulib \
  lib \
  preprocessor \
  configure \
  Makefile.in Makefile \
  $(OBJECTS) \
  $(FILES) \
  LICENSE \
  arch \
  docker \
  etc \
  doc \
  .travis.yml.in \
  ChangeLog
	mkdir -p $(HOPREPOSITORY) && \
	(cd ..; \
	 cp -r $(HZ) $(HZ)-$(HZVERSION); \
         tar cvfz $@ \
             --exclude='$(HZ)/private' \
             --exclude=.gitignore \
             --exclude=.git \
             --exclude=so \
             --exclude=arch/debian/build.$(HZ) \
             --exclude='*~' $(^:%=$(HZ)-$(HZVERSION)/%); \
         rm -rf $(HZ)-$(HZVERSION))

#*---------------------------------------------------------------------*/
#*    ChangeLog                                                        */
#*---------------------------------------------------------------------*/
ChangeLog:
	git log --pretty=format:"hiphop ($(HZVERSION)-1) unstable; urgency=low%n%n  * %s%n%n -- %an <%ae>  %cD%n" > ChangeLog
