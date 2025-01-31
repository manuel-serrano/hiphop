#*=====================================================================*/
#*    hiphop/doc/Makefile                                              */
#*    -------------------------------------------------------------    */
#*    Author      :  Manuel Serrano                                    */
#*    Creation    :  Mon Nov 16 10:15:32 2015                          */
#*    Copyright   :  2015-25 Manuel Serrano                            */
#*    -------------------------------------------------------------    */
#*    Build the documentation                                          */
#*=====================================================================*/
HOP=hop
HOPFLAGS="--no-so"
DOCJS=`$(HOP) --no-server --evaljs 'console.log(require(hop.config).docDir + "/doc.js")'`

#*---------------------------------------------------------------------*/
#*    Targets                                                          */
#*---------------------------------------------------------------------*/
COMMON_TARGETS=../index.html \
   idx.html api.html debug.html download.html lang.html \
   bib.html dev.html staging.html

LANG_SOURCES=README.md module.md signal.md flow.md async.md error.md syntax.md
MODULES_SOURCES=README.md promise.md timeout.md 

LANG_TARGETS=$(LANG_SOURCES:%.md=lang/%.html)
MODULES_TARGETS=$(MODULES_SOURCES:%.md=modules/%.html)

TARGETS=$(COMMON_TARGETS) $(LANG_TARGETS) $(MODULES_TARGETS)

all: $(TARGETS) lib css

lib:
	cp -r `$(HOP) --no-server --evaljs 'console.log(require(hop.config).docDir + "/lib")'` .

css:
	cp -r `$(HOP) --no-server --evaljs 'console.log(require(hop.config).docDir + "/hss")'` css
	cat hiphop.css >> css/doc.css

#*---------------------------------------------------------------------*/
#*    Search path                                                      */
#*---------------------------------------------------------------------*/
VPATH=syntax

#*---------------------------------------------------------------------*/
#*    Suffixes                                                         */
#*---------------------------------------------------------------------*/
.SUFFIXES:
.SUFFIXES: .md .html .json

#*---------------------------------------------------------------------*/
#*    doc                                                              */
#*---------------------------------------------------------------------*/
../index.html: ../README.md lib css/doc.css
	$(HOP) $(HOPFLAGS) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-library" $< -o $@ \
          || ($(RM) $@; exit 1)
	cp mermaid*.svg ..

#*---------------------------------------------------------------------*/
#*    idx.json ...                                                     */
#*---------------------------------------------------------------------*/
idx.json: debug.html $(LANG_TARGETS) $(MODULES_TARGETS) \
  dev.html api.html staging.html
	$(HOP) $(HOPFLAGS) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "html-to-idx" . -o $@ $^ \
          || ($(RM) $@; exit 1)

#*---------------------------------------------------------------------*/
#*    idx.html ...                                                     */
#*---------------------------------------------------------------------*/
idx.html: idx.json lib css/doc.css
	$(HOP) $(HOPFLAGS) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-idx" $< -o $@ \
          || ($(RM) $@; exit 1)

#*---------------------------------------------------------------------*/
#*    .md -> .html                                                     */
#*---------------------------------------------------------------------*/
%.html: %.md lib css/doc.css
	$(HOP) $(HOPFLAGS) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-section" $< -o $@ \
          || ($(RM) $@; exit 1)

#*---------------------------------------------------------------------*/
#*    .json -> .html                                                   */
#*---------------------------------------------------------------------*/
%.html: %.json lib css/doc.css
	$(HOP) $(HOPFLAGS) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-chapter" $< -o $@ \
          || ($(RM) $@; exit 1)

00-syntax.html: hiphop.bnf

doc.json: doc.json.in
	cp $< $@

#*---------------------------------------------------------------------*/
#*    css                                                              */
#*---------------------------------------------------------------------*/
css/doc.css: hiphop.css css
	cp `$(HOP) --no-server --evaljs 'console.log(require(hop.config).docDir + "/hss")'`/doc.css $@
	cat hiphop.css >> css/doc.css

#*---------------------------------------------------------------------*/
#*    clean                                                            */
#*---------------------------------------------------------------------*/
clean:
	$(RM) $(TARGETS)
	$(RM) -f idx.json
	$(RM) -rf lib css

cleanall: clean
	#$(RM) doc.json

#*---------------------------------------------------------------------*/
#*    dependencies                                                     */
#*---------------------------------------------------------------------*/
lang.html: lang/README.md
syntax.html: syntax/hiphop.bnf
bib.html: hiphop.bib
