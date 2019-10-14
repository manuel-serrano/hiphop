;; -*- mode: lisp -*-
;*=====================================================================*/
;*    serrano/prgm/project/hiphop/hiphop/etc/hopjs-hiphop.el.in        */
;*    -------------------------------------------------------------    */
;*    Author      :  Manuel Serrano                                    */
;*    Creation    :  Tue Sep 18 14:43:03 2018                          */
;*    Last change :  Tue Oct  1 08:16:49 2019 (serrano)                */
;*    Copyright   :  2018-19 Manuel Serrano                            */
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

;*---------------------------------------------------------------------*/
;*    constants ...                                                    */
;*---------------------------------------------------------------------*/
(defconst hiphop-version "0.4.0")

;;;###autoload
(defcustom hiphop-mode-line-string " HipHop"
  "*String displayed on the modeline when HipHop is active.
Set this to nil if you don't want a modeline indicator."
  :group 'hiphop
  :type '(choice string (const :tag "None" nil)))

;; font lock
(defcustom hiphop-font-lock-keywords
  (list
   (cons "\\(?:hiphop\\|hop\\)\\>" 'font-lock-face-hopjs12)
   (cons "\\<\\(?:fork\\|par\\|in\\|out\\)\\>" 'font-lock-keyword-face)
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
;*    automode                                                         */
;*---------------------------------------------------------------------*/
(hiphop-mode)
