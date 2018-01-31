angular.module('clickOut' ,[])
    //директива для отслеживания кликов вне элемента
    .directive('clickOut', ['$window', '$parse', function ($window, $parse) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                let clickOutHandler = $parse(attrs.clickOut);

                angular.element($window).on('click', onClick);

                function onClick(event) {
                    if (element[0].contains(event.target)) return;
                    clickOutHandler(scope, {$event: event});
                    scope.$apply();
                }

                scope.$on("$destroy", () => angular.element($window).off('click', onClick));
            }
        };
    }]);

