#*=====================================================================*/
#*    hiphop/doc/Makefile                                              */
#*    -------------------------------------------------------------    */
#*    Author      :  Manuel Serrano                                    */
#*    Creation    :  Mon Nov 16 10:15:32 2015                          */
#*    Copyright   :  2015-18 Manuel Serrano                            */
#*    -------------------------------------------------------------    */
#*    Build the documentation                                          */
#*=====================================================================*/
HOP=hop
DOCJS=`$(HOP) --no-server --evaljs 'console.log( require( hop.config ).docDir + "/doc.js" )'`

#*---------------------------------------------------------------------*/
#*    Targets                                                          */
#*---------------------------------------------------------------------*/
COMMON_TARGETS=index.html idx.html 00-syntax.html api.html debug.html download.html

LANG_TARGETS=lang.html 00-syntax.html

TARGETS=$(COMMON_TARGETS) $(LANG_TARGETS)

all: $(TARGETS) lib hss

lib: $(TARGETS)
	cp -r `$(HOP) --no-server --evaljs 'console.log( require( hop.config ).docDir + "/lib" )'` .

hss:
	cp -r `$(HOP) --no-server --evaljs 'console.log( require( hop.config ).docDir + "/hss" )'` .

#*---------------------------------------------------------------------*/
#*    Suffixes                                                         */
#*---------------------------------------------------------------------*/
.SUFFIXES:
.SUFFIXES: .md .html .json

#*---------------------------------------------------------------------*/
#*    doc                                                              */
#*---------------------------------------------------------------------*/
index.html: _index.md
	$(HOP) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-library" $< > $@ \
          || ($(RM) $@; exit 1)

#*---------------------------------------------------------------------*/
#*    idx.json ...                                                     */
#*---------------------------------------------------------------------*/
idx.json: debug.html 00-syntax.html api.html
	$(HOP) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "html-to-idx" . $^ > $@ \
          || ($(RM) $@; exit 1)

#*---------------------------------------------------------------------*/
#*    idx.html ...                                                     */
#*---------------------------------------------------------------------*/
idx.html: idx.json
	$(HOP) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-idx" $^ > $@ \
          || ($(RM) $@; exit 1)

#*---------------------------------------------------------------------*/
#*    .md -> .html                                                     */
#*---------------------------------------------------------------------*/
%.html: %.md 
	$(HOP) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-section" $< > $@ \
          || ($(RM) $@; exit 1)

#*---------------------------------------------------------------------*/
#*    .json -> .html                                                   */
#*---------------------------------------------------------------------*/
%.html: %.json
	$(HOP) $(EFLAGS) -q --no-clear-cache --no-cache --no-server -- \
          $(DOCJS) "compile-chapter" $< > $@ \
          || ($(RM) $@; exit 1)

00-syntax.html: hiphop.bnf

doc.json: doc.json.in
	cp $< $@

#*---------------------------------------------------------------------*/
#*    clean                                                            */
#*---------------------------------------------------------------------*/
clean:
	$(RM) $(TARGETS)
	$(RM) -f idx.json
	$(RM) -rf lib hss

cleanall: clean
	#$(RM) doc.json

#*---------------------------------------------------------------------*/
#*    dependencies                                                     */
#*---------------------------------------------------------------------*/
lang.html: _lang.md
