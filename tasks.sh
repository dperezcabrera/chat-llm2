#!/bin/bash

# Global configurations
set -euo pipefail
[ -n "${DEBUG_SCRIPT:-}" ] && set -x

SCRIPT=$(basename "$0")
LOCATION="$( cd "$( dirname "$0" )" && pwd )"
readonly SCRIPT_DIR="$(dirname "$(realpath "$0")")"

cd "$SCRIPT_DIR"

# configurations
IMAGE="chat-llm2"

# Public functions
build() {
    _log_info "Building ..."
    docker build -t $IMAGE .
    _log_info "built"
}

run() {
    _log_info "Running ..."
    docker run -it --rm \
        -v "$PWD/models:/models" \
        -p 5000:5000 \
        $IMAGE
   
    _log_info "Finished"
}

download_model() {
    if [ ! -d models ]; then mkdir models; fi
    wget 'https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q5_K_M.gguf?download=true' -O models/llama-2-7b-chat.Q5_K_M.gguf
}

clean() {
    _log_info "Cleaning"
    docker images | grep '<none>' | tr -s " " | cut -f3 -d" " | while read line; do docker rmi $line; done
    _log_info "Cleaned"
}

# Template functions

_check_dependencies() {
    local dependencies=("sed")
    for dep in "${dependencies[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            _log_error "Dependency '$dep' is not installed."
            exit 1
        fi
    done
}

_log_info() {
    echo "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] INFO - $1${RESET}"
}

_log_error() {
    echo "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR - $1${RESET}" >&2
}

_log_warn() {
    echo "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN - $1${RESET}"
}

shortlist() {
    compgen -A function | grep -v -E "^_|^main$"
}

help() {
    echo "Valid parameters: $(shortlist | tr '\n' '|' | sed 's/|$//')"
}

_setup_colors() {
    if [ -t 1 ]; then
        RED=$(tput setaf 1)
        GREEN=$(tput setaf 2)
        YELLOW=$(tput setaf 3)
        RESET=$(tput sgr0)
    else
        RED=""
        GREEN=""
        YELLOW=""
        RESET=""
    fi
}

main() {
    if [ $# -eq 0 ]; then
        help
        exit 0
    else
        local param="$1"
        shift
    fi

    if [[ $(shortlist | grep -E "^$param$") ]]; then 
        "$param" "$@"
    else
        _log_error "Incorrect parameter '$param'."
        help
        exit 1
    fi
}

_setup_colors

trap '_cleanup_exit' INT TERM
_cleanup_exit() {
    _log_info "Cleanup completed."
    exit 0
}

_check_dependencies

main "$@"

