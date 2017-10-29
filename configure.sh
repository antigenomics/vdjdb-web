#!/bin/bash

function printHelp() {
    echo "Usage: configure.sh <options>"
    echo "Available options":
    echo "  -h, --help              - prints this message"
    echo "  -o, --output            - specify output directory"
    echo "  -b, --backend           - build backend and package"
    echo "  -f, --frontend          - build frontend"
    echo "  -a, --all               - build frontend and backend"
    echo "  -u, --unzip             - unzip package"
}

if [ "$#" -eq "0" ]; then
    printHelp
    exit 0
fi

backend=false
frontend=false
all=false
unzip=false

baseDirectory="target/universal"
outputDirectory="target/universal"
while (( "$#" )); do
    argument="$1"
    case ${argument} in
        -h|--help)
            printHelp
            exit 0
            ;;
        -o=*|--output=*|-o|--output)
            if [ "${argument}" == "-o" ] || [ "$argument" == "--output" ]; then
                shift
                outputDirectory=`echo ${1}`
            else
                outputDirectory=`echo ${argument} | sed 's/[-a-zA-Z0-9]*=//'`
            fi
            ;;
        -b|--backend)
            backend=true
            ;;
        -f|--frontend)
            frontend=true
            ;;
        -a|--all)
            all=true
            ;;
        -u|--unzip)
            unzip=true
            ;;
        *)
        echo "Warning: Unknown option: ${argument}"
        ;;
    esac
    shift
done

if [ "$backend" == false ] && [ "$frontend" == false ] && [ "$all" == false ]; then
    echo "Please choose one of --backend, --frontend, --all (see help -h or --help)"
    exit 0
elif [ "$all" == true ]; then
    sbt build
else
    if [ "$frontend" == true ]; then
        sbt buildFrontend
    fi
    if [ "$backend" == true ]; then
        sbt buildBackend
    fi
fi

if [ "$outputDirectory" != "$baseDirectory" ]; then
    echo "Output directory: ${outputDirectory}"
    mkdir -p ${outputDirectory}
    mv ${baseDirectory}/vdjdb*.zip ${outputDirectory}
    if [ "$unzip" == true ]; then
        cd ${outputDirectory}
        unzip vdjdb*.zip
    fi
fi

exit 0