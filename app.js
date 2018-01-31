angular.module('app' ,['dropdownSelect'])
    .controller('appController', ['$scope', controller]);

    function controller(scope) {
        const ctrl = this;

        ctrl.dropdownValues = {id: 1, name: "Option 1"};
        ctrl.options = [
            {id: 1, name: "Option 1"},
            {id: 2, name: "Option 2"},
            {id: 3, name: "Option 3"},
            {id: 4, name: "Test"},
            {id: 5, name: "Test1"},
            {id: 6, name: "Test2"},
            {id: 7, name: "Test3"},
            {id: 8, name: "Test4"},
            {id: 9, name: "Test5"},
            {id: 10, name: "Test6"},
            {id: 11, name: "Test7"}
        ];

        ctrl.disabledModel = [];

        ctrl.onChange = function(val) {
            console.log(ctrl.testValues);
            console.log(ctrl.dropdownValues);
        }
    }
