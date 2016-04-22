angular.module('app-tns').controller('tnsController', ['$scope', function($scope) {

    /**
     * Load our antlr4 object  
     */
    var antlr4 = require('js/lib/antlr4/index');


    /**
     * Load the antlr Lexer object
     */
    var tnsnamesLexer = require('js/lib/tnsnamesLexer');


    /**
     * Load the antlr Parser object
     */
    var tnsnamesParser = require('js/lib/tnsnamesParser');


    /**
     * Load the antlr Listener object
     */
    var tnsnamesListener = require('js/lib/tnsnamesListener');








    /**
     * Display errors to the user
     * todo(bwills): would be nice to still log the full trace in console?
     *
     * @param message {string} - the error message to display
     */
    function showError(message) {
        $scope.errors = message;
        $scope.$apply();
    }


    /**
     * Sets the ora file meta data items into the controller scope 
     *
     * @param file {file Object} - the ora file of interest
     * @param fileString {string} - the full file string output from the ora file
     */
    function setScopeFileMetaData(file, fileString) {
        try {
            $scope.file = file;
            $scope.file.fileString = fileString;
        } catch (e) {
            showError("Unable to set file metadata: " + e.message);
        }
    }


    /**
     * Associates the individual TNS entries raw text into the entry itself 
     * todo(bwills): need to remove entryArray create stuff 
     * todo(bwills): would be nice to capture all the comments too
     *
     * @param entries {Object} - the array of tns entries to examine
     * @param fileString {string} - the full file string output from the ora file
     */
    function setTextFromFileString(entries, fileString) {
        try {
            var entryArray = [];
            var fileArray = fileString.split(/\r\n|\r|\n/);
            angular.forEach(entries, function(entry, index){
                if(entry.startLine){
                    var rawText = "";
                    for (var line = entry.startLine; line <= entry.endLine; line++) {
                        rawText += fileArray[line - 1] + '\r\n';
                    }
                    entry.rawText = rawText;
                    entryArray.push(entry);
                }
            });
            return entryArray;
        } catch (e) {
            showError("Unable to set raw text:" + e.message);
        }
    }


    /**
     * Collect all the Keys from the entries object
     * We need this for setting any filtering drop down lists 
     * Sorts the array
     * todo(bwills): this should be limited to only what we want to show not all antlr4 stuff
     * todo(biwlls): way to many keys are in here so fix that
     *
     * @param entries {Object} - the array of tns entries to examine
     */
    function getAllKeysFromEntries(entries){
        try
        {
            var keys = [];
            angular.forEach(entries, function(entry, index){
                for (var key in entry) {
                  if (entry.hasOwnProperty(key))  {
                    if(keys.indexOf(key) == -1){
                        keys.push(key);
                    }
                  }
                }
            });
            return keys.sort();
        } catch (e) {
            showError("Unable to get keys from entries:" + e.message);
        }
    }


    /**
     * Use Antlr to parse the file String into memory
     * todo(bwills): need to get tns.entry into an array not convert
     * 
     * @param fileString {string} - the full file string output from the ora file
     */
    function parseFileStringIntoMemory(fileString) {
        try {

            // Create Antlr4 items
            var chars = new antlr4.InputStream(fileString);
            var lexer = new tnsnamesLexer.tnsnamesLexer(chars);
            var tokens = new antlr4.CommonTokenStream(lexer);
            var parser = new tnsnamesParser.tnsnamesParser(tokens);
            var listener = new tnsnamesListener.tnsnamesListener();

            // Create global TNS items
            tns.errors = [];
            tns.entries = {};
            tns.parser = parser;

            // Parse and add to scope
            var tree = parser.tnsnames();
            antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree);

            $scope.parseErrors = tns.errors;
            $scope.entryKeys = getAllKeysFromEntries(tns.entries);
            $scope.entries = setTextFromFileString(tns.entries, fileString);
            
        } catch (e) {
            showError("Unable to parse file string into memory: " + e.message);
        }
    }


    /** 
     * Return a single ORA file to work with 
     * This only considers .ora files in our file array
     * The single file we use is the last .ora file in our files array  
     *
     * @param files {file array} - the files of interest
     */
    function isolateSingleORAFile(files) {
        try {
            var oraFiles = [];
            angular.forEach(files, function(file, index) {
                var fileTypeFromName = file.name.split('.').pop();
                if (fileTypeFromName.toLowerCase() == 'ora') {
                    oraFiles.push(file);
                }
            });

            if (oraFiles.length) {
                var lastFileIndex = oraFiles.length - 1;
                return oraFiles[lastFileIndex];
            }

            return false;
        } catch (e) {
            showError("Unable to isolate ora file: " + e.message);
        }
    }













    /**
     * Clears the TNS Entry search input
     */
    $scope.ClearSearch = function (){
        $scope.search = "";
    }


    /**
     * Reset the control objects and messages to an empty state
     */
    $scope.ResetControl = function() {
        $scope.sort = "";
        $scope.file = "";
        $scope.search = "";
        $scope.errors = "";
        $scope.entries = "";
        $scope.parseErrors = "";
    }


    /**
     * The start of our parsing process
     * If there are no ora files detected we throw and error
     *
     * @param oraFile {file} - the single ora file of interest
     */
    $scope.ParseFile = function(files) {
        try {
            $scope.ResetControl();
            var oraFile = isolateSingleORAFile(files);

            // If we do not have an .ora file let them know
            if (!oraFile) {
                throw new Error(
                    "TNSnames.ora file not found, " +
                    "make sure the file ends with .ora"
                );
            }

            // read the file string and parse
            var reader = new FileReader();
            reader.onload = (function(file) {
                return function(e) {
                    var fileString = e.target.result;
                    setScopeFileMetaData(file, fileString);
                    parseFileStringIntoMemory(fileString);
                    $scope.$apply();
                };
            })(oraFile);
            reader.readAsText(oraFile);
        } catch (e) {
            showError("Unable to parse file: " + e.message);
        }
    }
}]);