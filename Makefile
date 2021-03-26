# See https://stackoverflow.com/a/18137056
MAKEFILE_PATH := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# -----------------------------------------------
# Test Runtime Configuration
# -----------------------------------------------

# Project name
NAME ?= jellyfish

DATABASE ?= postgres
export DATABASE

# The default postgres user is your local user
POSTGRES_USER ?= $(shell whoami)
export POSTGRES_USER
POSTGRES_PASSWORD ?=
export POSTGRES_PASSWORD
POSTGRES_PORT ?= 5432
export POSTGRES_PORT
POSTGRES_HOST ?= localhost
export POSTGRES_HOST
POSTGRES_DATABASE ?= jellyfish
export POSTGRES_DATABASE

# silence graphile-worker logs
NO_LOG_SUCCESS = 1
export NO_LOG_SUCCESS

PORT ?= 8000
export PORT
LOGLEVEL ?= info
export LOGLEVEL
DB_HOST ?= localhost
export DB_HOST
DB_PORT ?= 28015
export DB_PORT
DB_USER ?=
export DB_USER
DB_PASSWORD ?=
export DB_PASSWORD
SERVER_HOST ?= http://localhost
export SERVER_HOST
SERVER_PORT ?= $(PORT)
export SERVER_PORT
METRICS_PORT ?= 9000
export METRICS_PORT
SOCKET_METRICS_PORT ?= 9001
export SOCKET_METRICS_PORT
SERVER_DATABASE ?= jellyfish
export SERVER_DATABASE
UI_PORT ?= 9000
export UI_PORT
UI_HOST ?= $(SERVER_HOST)
export UI_HOST
LIVECHAT_HOST ?= $(SERVER_HOST)
export LIVECHAT_HOST
LIVECHAT_PORT ?= 9100
export LIVECHAT_PORT
DB_CERT ?=
export DB_CERT
LOGENTRIES_TOKEN ?=
export LOGENTRIES_TOKEN
SENTRY_DSN_SERVER ?=
export SENTRY_DSN_SERVER
NODE_ENV ?= test
export NODE_ENV
REDIS_NAMESPACE ?= $(SERVER_DATABASE)
export REDIS_NAMESPACE
REDIS_PASSWORD ?=
export REDIS_PASSWORD
REDIS_PORT ?= 6379
export REDIS_PORT
REDIS_HOST ?= localhost
export REDIS_HOST
POD_NAME ?= localhost
export POD_NAME
OAUTH_REDIRECT_BASE_URL ?= $(SERVER_HOST):$(UI_PORT)
export OAUTH_REDIRECT_BASE_URL
MONITOR_SECRET_TOKEN ?= TEST
export MONITOR_SECRET_TOKEN
RESET_PASSWORD_SECRET_TOKEN ?=
export RESET_PASSWORD_SECRET_TOKEN

FS_DRIVER ?= localFS
export FS_DRIVER
AWS_ACCESS_KEY_ID ?=
export AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY ?=
export AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME ?=
export AWS_S3_BUCKET_NAME
INTEGRATION_DEFAULT_USER ?= admin
export INTEGRATION_DEFAULT_USER

# Automatically created user
# when not running in production
TEST_USER_USERNAME ?= jellyfish
export TEST_USER_USERNAME
TEST_USER_PASSWORD ?= jellyfish
export TEST_USER_PASSWORD
TEST_USER_ROLE ?= user-test
export TEST_USER_ROLE
TEST_USER_ORGANIZATION ?= balena
export TEST_USER_ORGANIZATION

MAIL_TYPE ?= mailgun
export MAIL_TYPE
MAILGUN_TOKEN ?=
export MAILGUN_TOKEN
MAILGUN_DOMAIN ?= mail.ly.fish
export MAILGUN_DOMAIN
MAILGUN_BASE_URL = https://api.mailgun.net/v3
export MAILGUN_BASE_URL

# GitHub
INTEGRATION_GITHUB_APP_ID ?=
export INTEGRATION_GITHUB_APP_ID

# The base64 encoded PEM key
INTEGRATION_GITHUB_PRIVATE_KEY ?=
export INTEGRATION_GITHUB_PRIVATE_KEY

TEST_INTEGRATION_GITHUB_REPO ?= product-os/jellyfish-test-github
export TEST_INTEGRATION_GITHUB_REPO
TEST_INTEGRATION_FRONT_INBOX_1 ?= inb_qf8q # Jellyfish Testfront
export TEST_INTEGRATION_FRONT_INBOX_1
TEST_INTEGRATION_FRONT_INBOX_2 ?= inb_8t8y # Jellyfish Test Inbox
export TEST_INTEGRATION_FRONT_INBOX_2
TEST_INTEGRATION_DISCOURSE_CATEGORY ?= 44 # sandbox
export TEST_INTEGRATION_DISCOURSE_CATEGORY
TEST_INTEGRATION_DISCOURSE_USERNAME ?= jellyfish
export TEST_INTEGRATION_DISCOURSE_USERNAME
TEST_INTEGRATION_DISCOURSE_NON_MODERATOR_USERNAME ?= jellyfish-test
export TEST_INTEGRATION_DISCOURSE_NON_MODERATOR_USERNAME

# -----------------------------------------------
# Rules
# -----------------------------------------------

# Define make commands that wrap npm scripts to ensure a more consistent workflow across repos
.PHONY: clean
clean:
	npm run clean

.PHONY: build
build:
	npm run build

.PHONY: lint
lint:
	npm run lint

.PHONY: lint-fix
lint-fix:
	npm run lint-fix

.PHONY: test-unit
test-unit:
	npm run unit

.PHONY: test
test:
	npm run test

.PHONY: test-integration
test-integration:
	npm run test-integration -- --verbose

.PHONY: doc
doc:
	npm run doc

.PHONY: prepack
prepack:
	npm run prepack

.PHONY: check
check:
	npm run check
