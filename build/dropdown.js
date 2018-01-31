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

                scope.$on('$destroy', () => angular.element($window).off('click', onClick));
            }
        };
    }]);


angular.module('dropdownSelect', ['clickOut'])
    //необходим для парсинга выражения в options параметре
    .constant('dropdownRegxp', {
        options: /^(\w*\.)+(\w+)\s+in\s+(\w*\.)*(\w+)$/,
        withoutSpaces: /\S+/g,
        item: /\w*/
    })
    .directive('dropdownSelect', ['$parse', 'dropdownRegxp', '$sce', '$timeout', function($parse, regexp, $sce, $timeout) {
        const dropdownTemplate = 
        '<div class="selected-list" ' +
        'click-out="clickOut()" ' +
        'ng-class="{\'selected-list_focused\': dropOpened, \'disabled-list\': disabled}">' +
            '<div class="{{isMultiple ? \'selected-list__multiple-item\' : \'selected-list__item\'}}" ' +
                'ng-show="values.length" ' +
                'ng-click="deleteItem($index)" ' +
                'ng-repeat="value in values track by value.id" ' +
                '><span ng-bind-html="::getLabelAsHtml(value)"></span><span class="delete-btn"></span></div>' +
                '<div class="selected-list__input" ng-show="isMultiple || (!values.length && !isMultiple)">' +
                '<input type="text" ng-model="query" ' +
                'ng-change="queryChanged()" ' +
                 'ng-keydown="keyDown($event)" ' +
                'placeholder="{{values.length ? \'\' : placeholder}}" ' +
                'ng-focus="inputFocused()" >' +
            '</div>' +
            '<div class="selected-list__state {{getStateDecoratorName()}}"></div></div>' +
            '<div class="dropdown-list" ng-if="dropOpened && options.length">' + 
            '<div ng-repeat="item in options track by item.id" ' +
            'class="dropdown-list__item" ' +
            'ng-bind-html="::getLabelAsHtml(item)" ' +
            'ng-click="selectValue($index)"></div>' +
            '</div>';

        return {
            restrict: 'E',
            require: 'ngModel',
            scope: {},
            template: dropdownTemplate,
            link: function(scope, element, attrs, ctrl) {
                const {options, placeholder, disabledPlaceholder} = attrs;
                
                scope.isMultiple = !!attrs.multiple;
                scope.query = '';
                scope.values = [];
                scope.focusedIndex = -1;//индекс элемента, на котором стоит фокус

                if(regexp.options.test(options) === false) {
                    throw new Error('Выражение в options не соответсвует api');
                }

                const matchedOptions = options.match(regexp.withoutSpaces),
                modelName = matchedOptions[0],
                itemName = matchedOptions[0].match(regexp.item)[0];
                collectionName = matchedOptions[2],
                parsedDisplayName = $parse(modelName),//получаем $parse для label 
                parsedCollection = $parse(collectionName);//коллекция объектов

                attrs.$observe('disabled',(value) => {
                    scope.disabled = value === 'true';
                    if(scope.disabled) {
                        element.find('input').prop('disabled', value);
                    } else {
                        element.find('input').removeAttr('disabled');
                    } 
                    scope.placeholder = scope.disabled ? disabledPlaceholder : placeholder;
                });
                
                //отслеживает изменения модели todo добавить отвязку в destroy
                const modelWatcher = scope.$parent.$watch(attrs.ngModel, (newVal) => {
                    scope.values = angular.isArray(newVal) ? newVal : getArrayWithValue(newVal);
                });

                /**
                 * Если value объект, то возвращает массив с value, иначе возвращает пустой массив
                 * @param {} value 
                 * @return Array
                 */
                function getArrayWithValue(value) {
                    if(value && angular.isObject(value)) {
                        return [value];
                    }

                    return [];
                }

                function getLabel(item) {
                    const cover = getCoverForItem(item);
                    return parsedDisplayName(cover);
                }

                scope.getStateDecoratorName = function() {
                    let className = 'selected-list__state_'
                    if(scope.query) {
                        className += 'search';
                    } else {
                        className += scope.dropOpened ? 'opened' : 'closed';
                    }

                    return className;
                }

                scope.clickOut = function() {
                    scope.dropOpened = false;
                    scope.focusedIndex = -1;
                }

                scope.inputFocused = function() {
                    scope.dropOpened = true;
                }

                scope.deleteItem = function(itemIndex) {
                    if(!scope.disabled) {
                        const item = scope.values[itemIndex];
                        scope.values = scope.values.filter((item, indx) => indx !== itemIndex);
                        scope.queryChanged();
                        ctrl.$setViewValue(scope.isMultiple ? scope.values.slice() : scope.values[0]);
                        setFocusInInput();
                    }
                }

                function setFocusInInput() {
                    $timeout(() => {
                        element.find('input')[0].focus();
                    }, 0);
                }

                scope.selectValue = function(index) {
                    if(scope.disabled) {
                        return;
                    }

                    const item = scope.options[index];
                    if(scope.isMultiple) {
                        scope.values.push(item);
                        ctrl.$setViewValue(scope.values.slice());
                        setFocusInInput();
                    } else {
                        scope.values = [item];
                        ctrl.$setViewValue(item);
                    }

                    
                    scope.query = '';
                    scope.queryChanged();
                }

                scope.getLabelAsHtml = function(item) {
                    return $sce.trustAsHtml(getLabel(item));
                }

                scope.getCollection = function() {
                    return parsedCollection(scope.$parent);
                }

                scope.queryChanged = function() {
                    if(scope.focusedIndex > -1 && scope.dropOpened) {
                        const list = element[0].querySelector('.dropdown-list');
                        list && list.children.length && setFocusAndGetElement(list, scope.focusedIndex);
                        scope.focusedIndex = -1;
                    }

                    scope.options = doFilterOptions(scope.query);
                }

                scope.keyDown = function(event) {
                    const {keyCode} = event;
                    let prevFocusedIndex = scope.focusedIndex;

                    if(keyCode === 40 || keyCode === 38) {
                        if(keyCode === 40) {
                            if(scope.focusedIndex < scope.options.length - 1) {
                                scope.focusedIndex++;
                            }
                        } else {
                            scope.focusedIndex > 0 && scope.focusedIndex--;
                        }

                        scope.dropOpened = true;
                        focusElement(scope.focusedIndex, prevFocusedIndex);
                        event.preventDefault();
                        return;
                    }

                    if(keyCode === 13) {
                        if(scope.focusedIndex > -1) {
                            scope.selectValue(scope.focusedIndex);
                            scope.clickOut();

                            scope.isMultiple && setFocusInInput();
                        }
                    }
                }


                function focusElement(index, prevIndex) {
                    $timeout(() => {
                        const list = element[0].querySelector('.dropdown-list');

                        if(list) {
                            const {children} = list;
                            if(children.length) {
                                setFocusAndGetElement(list, prevIndex);
                                const nextEl = setFocusAndGetElement(list, index, true);
                                nextEl && scrollToFocusedElement(list, nextEl);
                            }
                        }
                    });
                }

                /**
                 * Снимает или ставит класс css, показывающий, что элемент находится в фокусе
                 * @param {*} list - ссылка на дом элемент списка
                 * @param {*} index - индекс элемента, которому необходимо удалить/установить класс фокуса
                 * @param {*} set -boolean, если true, то добавить, иначе - снять
                 */
                function setFocusAndGetElement(list, index, set = false) {
                    const el = list.children[index];
                    if(el) {
                        set ? el.classList.add('dropdown-list__item_focused') : 
                        el.classList.remove('dropdown-list__item_focused');
                    }

                    return el;
                }

                function scrollToFocusedElement(list, focusedEl) {
                    const scrollTop = list.scrollTop,
                          offsetTop = focusedEl.offsetTop,
                          offsetHeightEl = focusedEl.offsetHeight,
                          offsetHeightList = list.offsetHeight;

                    //если элемент находится выше, чем показывая область
                    if(scrollTop + offsetHeightList < offsetTop + offsetHeightEl) {
                        list.scrollTop = offsetTop + offsetHeightEl - offsetHeightList;
                    } else if(scrollTop > offsetTop){ //если элемент находится ниже
                        list.scrollTop = offsetTop;
                    }
                }

                //фильтрует по value(регуляркой) и затем проверяет, нет ли в отфильтрованных значений
                //тех, что уже выбраны
                function doFilterOptions(value) {
                    return scope.getCollection().filter(opt => {
                        const label = getLabel(opt);
                        return new RegExp(value).test(label);
                    }).filter(opt => !scope.values.find(val => val.id === opt.id));
                }

                /**
                 * Возвращает обертку над объектом, чтобы $parse мог найти путь к свойсту
                 * @param {*} item 
                 * @return {}
                 */
                function getCoverForItem(item) {
                    const cover = {};
                    cover[itemName] = item;
                    return cover;
                }

                scope.$on('$destroy', () => modelWatcher());

                scope.queryChanged();
            }
        }
    }])