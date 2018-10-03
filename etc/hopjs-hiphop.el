;; -*- mode: lisp -*-
;*=====================================================================*/
;*    serrano/prgm/project/hiphop/hiphop/etc/hopjs-hiphop.el.in        */
;*    -------------------------------------------------------------    */
;*    Author      :  Manuel Serrano                                    */
;*    Creation    :  Tue Sep 18 14:43:03 2018                          */
;*    Last change :  Sun Sep 30 14:34:35 2018 (serrano)                */
;*    Copyright   :  2018 Manuel Serrano                               */
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
(defconst hiphop-version "0.2.0")

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
   (cons "\\(?:fork\\|par\\)\\>" 'font-lock-keyword-face)
   (cons "\\(?:loop\\|every\\|while\\|do\\|abort\\|module\\|run\\|signal\\)\\>" 'font-lock-keyword-face)
   (cons "\\(?:now\\|pre\\|nowval\\|preval\\)\\>" 'font-lock-face-hopjs8)
   (list (concat "\\s-*\\(?:module\\)\\s-+\\(" js--name-re "\\)") 1 'font-lock-function-name-face))
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
;*    automode                                                         */
;*---------------------------------------------------------------------*/
(hiphop-mode)
