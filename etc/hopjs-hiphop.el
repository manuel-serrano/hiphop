;; -*- mode: lisp -*-
;*=====================================================================*/
;*    serrano/prgm/project/hiphop/hiphop/etc/hopjs-hiphop.el.in        */
;*    -------------------------------------------------------------    */
;*    Author      :  Manuel Serrano                                    */
;*    Creation    :  Tue Sep 18 14:43:03 2018                          */
;*    Last change :  Fri Jul 22 08:31:57 2022 (serrano)                */
;*    Copyright   :  2018-22 Manuel Serrano                            */
;*    -------------------------------------------------------------    */
;*    HipHop emacs addon                                               */
;*=====================================================================*/

;*---------------------------------------------------------------------*/
;*    The package                                                      */
;*---------------------------------------------------------------------*/
(provide 'hopjs-hiphop)
(require 'json)
(require 'js)
(require 'hopjs)
(require 'hopjs-parse)
(require 'hopjs-macro)

;*---------------------------------------------------------------------*/
;*    debugging, to be removed                                         */
;*---------------------------------------------------------------------*/
(define-key (current-local-map)
  "\C-x\C-z"
  '(lambda ()
     (interactive)
     (load-library "hopjs.el")
     (load-library "hopjs-macro.el")
     (load-library "hopjs-parse.el")
     (load-library "hopjs-config.el")
     (load-library "hopjs-hiphop.el")))

;*---------------------------------------------------------------------*/
;*    constants ...                                                    */
;*---------------------------------------------------------------------*/
(defconst hiphop-version "1.3.0")

;;;###autoload
(defcustom hiphop-mode-line-string " HipHop"
  "*String displayed on the modeline when HipHop is active.
Set this to nil if you don't want a modeline indicator."
  :group 'hiphop
  :type '(choice string (const :tag "None" nil)))

;; font lock
(defcustom hiphop-font-lock-keywords
  (list
   (cons "\\(?:hiphop\\|host\\)\\>" 'font-lock-face-hopjs12)
   (cons "\\<\\(?:fork\\|par\\|in\\|out\\|inout\\)\\>" 'font-lock-keyword-face)
   (cons "\\(?:loop\\|every\\|while\\|do\\|abort\\|weakabort\\|run\\|signal\\|module\\|interface\\|machine\\)\\>" 'font-lock-keyword-face)
   (cons "\\<\\(?:async\\|kill\\|suspend\\|resume\\)\\>" 'font-lock-face-hopjs3)
   (cons "\\(?:now\\|pre\\|nowval\\|preval\\)\\>" 'font-lock-face-hopjs8)
   (list (concat "\\s-*\\(?:machine\\|module\\|interface\\)\\s-+\\(" js--name-re "\\)") 1 'font-lock-function-name-face))
  "*The HipHop font-lock specification"
  :group 'hiphop)

;;;###autoload
(if (fboundp 'add-minor-mode)
    (add-minor-mode 'hiphop-mode
		    'hiphop-mode-line-string
		    nil
		    nil
		    'hiphop-mode)

  (or (assoc 'hiphop-mode minor-mode-alist)
      (setq minor-mode-alist
	    (cons '(hiphop-mode hiphop-mode-line-string)
		  minor-mode-alist)))

  (or (assoc 'hiphop-mode minor-mode-map-alist)
      (setq minor-mode-map-alist
	    (cons (cons 'hiphop-mode hiphop-mode-map)
		  minor-mode-map-alist))))

;*---------------------------------------------------------------------*/
;*    hiphop-mode ...                                                  */
;*---------------------------------------------------------------------*/
;;;###autoload
(defvar hiphop-mode nil)
(make-variable-buffer-local 'hiphop-mode)

;*---------------------------------------------------------------------*/
;*    hiphop-activate-mode ...                                         */
;*---------------------------------------------------------------------*/
(defun hiphop-activate-mode ()
  ;; font lock
  (if (fboundp 'font-lock-add-keywords) 
      (font-lock-add-keywords nil hiphop-font-lock-keywords)
    (progn
      (make-local-variable 'font-lock-defaults)
      (setq font-lock-defaults '(hiphop-font-lock-keywords))))
  (font-lock-mode nil)
  (font-lock-mode t)
  ;; the custom indentation
;*   (hiphop-custom-indent)                                            */
  ;; we end with the hiphop hooks
  (run-hooks 'hiphop-mode-hook)
  t)

;*---------------------------------------------------------------------*/
;*    hiphop-mode ...                                                  */
;*---------------------------------------------------------------------*/
;;;###autoload
(defun hiphop-mode (&optional arg)
  "Minor mode for editing Hiphop sources.

Hooks:
This runs `hiphop-mode-hook' after hiphop is enterend."
  (interactive "P")
  (let ((old-hiphop-mode hiphop-mode))
    ;; key bindings
    (define-key (current-local-map)
      "\C-x\C-h" 'hiphop-show-causality-cycles)
    (define-key (current-local-map)
      "\C-xh" 'hiphop-clear-causality-cycles)
    ;; Mark the mode as on or off.
    (setq hiphop-mode
	  (not (or (and (null arg) hiphop-mode)
		   (<= (prefix-numeric-value arg) 0))))
    ;; Do the real work.
    (unless (eq hiphop-mode old-hiphop-mode)
      (if hiphop-mode (hiphop-activate-mode) nil))
    ;; Force modeline redisplay.
    (set-buffer-modified-p (buffer-modified-p))))

;*---------------------------------------------------------------------*/
;*    hiphop-find-causality-log ...                                    */
;*---------------------------------------------------------------------*/
(defun hiphop-find-causality-log ()
  (let ((dir default-directory)
	(count 5)
	(file nil))
    (while (and (not file) (not (equal dir "//")) (> count 0))
      (let ((nm (concat dir "hiphop.causality.json")))
	(if (file-exists-p nm)
	    (setq file nm)
	  (progn
	    (setq dir (expand-file-name (concat dir "../")))
	    (setq count (1- count))))))
    file))

;*---------------------------------------------------------------------*/
;*    hiphop-causality-overlays ...                                    */
;*---------------------------------------------------------------------*/
(defvar hiphop-causality-overlays '())

;*---------------------------------------------------------------------*/
;*    put-text-properties ...                                          */
;*---------------------------------------------------------------------*/
(defun put-text-properties (start end &rest props)
  (let ((ov (make-overlay start end nil t nil))
	(mod (buffer-modified-p)))
    (setq hiphop-causality-overlays (cons ov hiphop-causality-overlays))
    (while (consp props)
      (overlay-put ov (car props) (cadr props))
      (setq props (cddr props)))
    (set-buffer-modified-p mod)))

;*---------------------------------------------------------------------*/
;*    hiphop-remove-causality-overlays ...                             */
;*---------------------------------------------------------------------*/
(defun hiphop-remove-causality-overlays ()
  (let ((l hiphop-causality-overlays))
    (while (consp l)
      (delete-overlay (car l))
      (setq l (cdr l)))))

;*---------------------------------------------------------------------*/
;*    hiphop-eow ...                                                   */
;*---------------------------------------------------------------------*/
(defun hiphop-eow (l)
  (save-excursion
    (goto-char l)
    (forward-word 1)
    (point)))

;*---------------------------------------------------------------------*/
;*    hiphop-clear-causality-cycles ...                                */
;*---------------------------------------------------------------------*/
(defun hiphop-clear-causality-cycles ()
  (interactive)
  (hiphop-remove-causality-overlays))

;*---------------------------------------------------------------------*/
;*    hiphop-show-causality-cycles ...                                 */
;*---------------------------------------------------------------------*/
(defun hiphop-show-causality-cycles ()
  (interactive)
  (hiphop-remove-causality-overlays)
  (let ((json (hiphop-find-causality-log)))
    (message "hiphop-show-causality-cycles [%s]" json)
    (when json
      (let ((v (json-read-file json)))
	(let ((i 0))
	  (while (< i (length v))
	    (let ((j 0))
	      (let ((c (aref v i)))
		(while (< j (length c))
		  (let ((locs (aref c j)))
		    (message "causality file %s" locs)
		    (let ((filename (assq 'filename locs))
			  (locations (assq 'locations locs)))
		  
		      (when (and filename locations)
			(let ((buf (find-buffer-visiting (cdr filename)))
			      (locs (cdr locations)))
			  (set-buffer buf)
			  (let ((l 0))
			    (while (< l (length locs))
			      (message "causality file %s %s-%s"
				       (cdr filename) (aref locs l)
				       (hiphop-eow (aref locs l)))
			      (put-text-properties
			       (aref locs l) (hiphop-eow (aref locs l))
			       'face 'highlight)
			      (setq l (+ l 1))))))))
		  (setq j (+ j 1)))))
	    (setq i (+ i 1))))))))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse ...                                           */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (let ((ctx hopjs-hiphop-context)
	 (tok (hopjs-parse-pop-token)))
     (case (hopjs-parse-peek-token-type)
       ((eop)
	(hopjs-parse-token-column otok indent))
       ((ident)
	(let ((val (hopjs-parse-token-string (hopjs-parse-peek-token))))
	  (cond
	   ((string= val "module")
	    (hopjs-hiphop-parse-module ctx otok indent))
	   (t
	    -10001))))
       ((interface)
	(hopjs-hiphop-parse-interface ctx otok indent))
       ((lbrace)
	(hopjs-parse-stmt ctx otok indent))
       (t
	-10000)))))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-module ...                                    */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-module (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-module (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (let ((mtok (hopjs-parse-pop-token)))
     (case (hopjs-parse-peek-token-type)
       ((eop)
	(hopjs-parse-token-column otok indent))
       ((ident)
	(hopjs-parse-pop-token)
	(orn (hopjs-parse-args ctx mtok hopjs-parse-indent nil)
	     (hopjs-hiphop-parse-implements ctx otok indent mtok)))
       ((lparen)
	(let ((ltok (hopjs-parse-peek-token)))
	  (orn (hopjs-parse-args ctx ltok 1 nil)
	       (hopjs-hiphop-parse-implements ctx otok indent mtok))))
       (t
	-10002)))))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-interface ...                                 */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-interface (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-interface (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (let ((itok (hopjs-parse-pop-token)))
     (case (hopjs-parse-peek-token-type)
       ((eop)
	(hopjs-parse-token-column otok indent))
       ((ident)
	(hopjs-parse-pop-token)
	(hopjs-hiphop-parse-implements ctx otok indent itok))
       (t
	-10003)))))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-implements ...                                */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-implements (ctx otok indent mtok)
  (with-debug
   "hopjs-hiphop-parse-implements (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (if (eq (hopjs-parse-peek-token-type) 'eop)
       (hopjs-parse-token-column otok indent)
     (if (string= (hopjs-parse-peek-token-string) "implements")
	 (let ((i (hopjs-parse-pop-token)))
	   (if (eq (hopjs-parse-peek-token-type) 'eop)
	       (hopjs-parse-token-column mtok hojs-parse-indent)
	     (orn (hopjs-parse-expr ctx otok indent)
		  (hopjs-parse-block ctx otok indent))))
       (hopjs-parse-block ctx otok indent)))))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-async ...                                     */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-async (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-async (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (let ((atok (hopjs-parse-pop-token)))
     (if (eq (hopjs-parse-peek-token-type) 'lparen)
	 (let ((ltok (hopjs-parse-pop-token)))
	   (if (eq (hopjs-parse-peek-token-type) 'ident)
	       (let ((itok (hopjs-parse-pop-token)))
		 (if (eq (hopjs-parse-peek-token-type) 'rparen)
		     (let ((rtok (hopjs-parse-pop-token)))
		       (if (eq (hopjs-parse-peek-token-type) 'lbracket)
			   (progn
			     (hopjs-parse-push-token rtok)
			     (hopjs-parse-push-token itok)
			     (hopjs-parse-push-token ltok)
			     (hopjs-parse-push-token atok)
			     (hopjs-parse-catch ctx otok indent))
			 (progn
			   (hopjs-debug 0 "hopjs-hiphop-parse-async.fail.4 rtok=%s itok=%s ltok=%s atok=%s ntok=%s"
				  rtok itok ltok atok (hopjs-parse-peek-token))
			   (hopjs-parse-push-token rtok)
			   (hopjs-parse-push-token itok)
			   (hopjs-parse-push-token ltok)
			   (hopjs-parse-push-token atok)
			   (hopjs-parse-stmt-expr ctx otok indent))))
		   (progn
		     (hopjs-debug 0 "hopjs-hiphop-parse-async.fail.3 itok=%s ltok=%s atok=%s ntok=%s"
				  itok ltok atok (hopjs-parse-peek-token))
		     (hopjs-parse-push-token itok)
		     (hopjs-parse-push-token ltok)
		     (hopjs-parse-push-token atok)
		     (hopjs-parse-stmt-expr ctx otok indent))))
	     (progn
	       (hopjs-debug 0 "hopjs-hiphop-parse-async.fail.2 ltok=%s atok=%s ntok=%s"
		      ltok atok (hopjs-parse-peek-token))
	       (hopjs-parse-push-token ltok)
	       (hopjs-parse-push-token atok)
	       (hopjs-parse-stmt-expr ctx otok indent))))
       (progn
	 (hopjs-debug 0 "hopjs-hiphop-parse-async.fail.1 atok=%s ntok=%s"
		      atok (hopjs-parse-peek-token))
	 (hopjs-parse-push-token atok)
	 (hopjs-parse-stmt-expr ctx otok indent))))))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-in ...                                        */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-in (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-in (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (hopjs-parse-decls ctx otok indent)))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-run ...                                       */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-run (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-run (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (let ((tok (hopjs-parse-pop-token)))
     (orn (hopjs-parse-expr ctx otok indent)
	  (case (hopjs-parse-peek-token-type)
	    ((eop)
	     (hopjs-parse-token-column otok indent))
	    ((lbrace)
	     (hopjs-hiphop-parse-run-args ctx tok hopjs-parse-indent))
	    (t
	     -10006))))))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-run-args ...                                  */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-run-args (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-run-args (%s) otok=%s indent=%s ntok=%s" (point)
   otok indent (hopjs-parse-peek-token)
   (let ((lbrace (hopjs-parse-pop-token))
	 (res nil))
     (while (not res)
       (case (hopjs-parse-peek-token-type)
	 ((binop)
	  (hopjs-parse-pop-token))
	 ((comma)
	  (hopjs-parse-pop-token)
	  (when (eq (hopjs-parse-peek-token-type) 'eop)
	    (setq res (hopjs-parse-token-column otok indent))))
	 ((ident)
	  (hopjs-parse-pop-token)
	  (case (hopjs-parse-peek-token-type)
	    ((eop)
	     (setq res (hopjs-parse-token-column otok indent)))
	    ((as)
	     (hopjs-parse-pop-token)
	     (when (eq (hopjs-parse-peek-token-type) 'eop)
	       (setq res (hopjs-parse-token-column otok indent))))))
	 ((rbrace)
	  (hopjs-parse-pop-token)
	  (setq res lbrace))
	 (t
	  (setq res -10008)))))))
  
;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-every ...                                     */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-every (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-every (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (hopjs-parse-while ctx (hopjs-parse-peek-token) 0)))
;*    (let ((tok (hopjs-parse-pop-token)))                             */
;*      (hopjs-parse-paren-expr ctx otok indent))))                    */

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-parse-fork ...                                      */
;*---------------------------------------------------------------------*/
(defun hopjs-hiphop-parse-fork (ctx otok indent)
  (with-debug
   "hopjs-hiphop-parse-fork (%s) otok=%s indent=%s ntok=%s"
   (point) otok indent (hopjs-parse-peek-token)
   (let ((dtok (hopjs-parse-pop-token)))
     (case (hopjs-parse-peek-token-type)
       ((eop)
	(hopjs-parse-token-column otok indent))
       ((dollar)
	(hopjs-parse-dollar hopjs-parse-initial-context dtok indent))
       (t
	(orn (hopjs-parse-block ctx dtok indent)
	     (cond
	      ((eq (hopjs-parse-peek-token-type) 'eop)
	       (hopjs-parse-token-column dtok indent))
	      ((string= (hopjs-parse-peek-token-string) "par")
	       (orn (hopjs-hiphop-parse-fork ctx dtok indent)
		    dtok))
	      (t
	       -10009))))))))

;*---------------------------------------------------------------------*/
;*    hiphop-parse-plugin                                              */
;*---------------------------------------------------------------------*/
(setq hopjs-parse-initial-context
      (vector
       ;; statments
       (cons (cons "hiphop" #'hopjs-hiphop-parse)
	     (aref hopjs-parse-initial-context 0))
       ;; expressions
       (cons (cons "hiphop" #'hopjs-hiphop-parse)
	     (aref hopjs-parse-initial-context 1))
       ;; start parse stmt
       "^hiphop "
       ;; extra collapsing
       '("fork")))

;*---------------------------------------------------------------------*/
;*    hopjs-hiphop-context ...                                         */
;*---------------------------------------------------------------------*/
(defvar hopjs-hiphop-context
  (vector (list (cons "async" #'hopjs-hiphop-parse-async)
		(cons "in" #'hopjs-hiphop-parse-in)
		(cons "run" #'hopjs-hiphop-parse-run)
		(cons "every" #'hopjs-hiphop-parse-every)
		(cons "fork" #'hopjs-hiphop-parse-fork))
	  (list (cons "${" #'hopjs-parse-dollar))
	  "^hiphop "
	  '("fork")))

;*---------------------------------------------------------------------*/
;*    automode                                                         */
;*---------------------------------------------------------------------*/
(hiphop-mode)
