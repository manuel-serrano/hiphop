PP_FILE = preprocessor.js
HH_PATH1 = ${HOME}/.node_modules/hiphop/preprocessor/
HH_PATH2 = ${HOME}/node_modules/hiphop/preprocessor/
HH_PATH3 = ./node_modules/hiphop/preprocessor/

ifneq ("$(wildcard $(HH_PATH1)/$(PP_FILE))", "")
PP = $(HH_PATH1)/$(PP_FILE)
else
ifneq ("$(wildcard $(HH_PATH2)/$(PP_FILE))", "")
PP = $(HH_PATH2)/$(PP_FILE)
else
ifneq ("$(wildcard $(HH_PATH2)/$(PP_FILE))", "")
PP = $(HH_PATH2)/$(PP_FILE)
else
$(error Hiphop.js preprocessor not found)
endif
endif
endif

all: compile start

compile:
	INPUT=./client.js OUTPUT=./client.out.js $(PP)

start:
	hop ./prims.js  -g


