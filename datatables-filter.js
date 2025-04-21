$.extend($.fn.dataTable.defaults, {
  ajax: {
    type: "POST",
    data: function (d) {
      d["FilterType"] = $('input[name="FilterType"]:checked').val();
    },
  },
  initComplete: function (settings, json) {
    const apiTable = this.api();
    const $currentElement = $(this[0]).closest(".dt-scroll").find(".dt-scroll-head table");
    const $dtInstance = $(this[0]);
    let delayTimer;

    if ($currentElement.data("filter")) {
        applyColumnSearch($currentElement);
        $(document).on("click", ".btn-search-data", () => apiTable.draw());
        $(document).on("click", ".reset-filter-btn", function() {
            const $form = $(this).closest("form");
            $form.find(":input").each(function () {
                if ($(this).is(":radio") && $(this).attr("name") === "FilterType") {
                    $(this).prop("checked", $(this).val() === "AND");
                }else{
                    $(this).val("").trigger("change");
                }
            });
            $form.find(".select2").each(function () {
                $(this).val("").trigger("change");
            });
            apiTable.draw()
        });
         
    }

    setupGlobalSearchWithDelay(apiTable);
    initSelect2();
    $(window).resize();

    function applyColumnSearch($tableElem) {
      $tableElem.closest(".card-body").find("form .form-group").each(function () {
        const $inputElements = $("input", this).add("select", this);
        $inputElements.on("keyup change search click", function () {
          setColumnSearch($(this));
        });
      });
    }

    function setColumnSearch($input) {
      const tableInstance = $dtInstance.DataTable();
      const columnIndex = $input.data("index");
      // if (tableInstance.column(columnIndex).search() !== $input.val()) {
      //   tableInstance.column(columnIndex).search($input.val());
      // }
      if($input.hasClass("date-picker")) {
          const dateFrom = $(`.${columnIndex}_datepicker_from`).val();
          const dateTo = $(`.${columnIndex}_datepicker_to`).val();
          tableInstance.column(columnIndex).search(`${dateFrom};${dateTo}`);
          return;
      }
      tableInstance.column(columnIndex).search($input.val());

    }

    function setupGlobalSearchWithDelay(apiTable) {
      const $searchInput = $(apiTable.table().container()).find("div.dataTables_filter input");
      $searchInput.unbind().on("keyup search", function () {
        clearTimeout(delayTimer);
        delayTimer = setTimeout(() => {
          apiTable.search($(this).val()).draw();
        }, 1000);
      });
    }
  },

  headerCallback: function () {
    const api = this.api();
    const $currentElement = $(this[0]).closest(".dt-scroll").find(".dt-scroll-head table");

    if ($currentElement.data("filter")) {
      if ($currentElement.closest(".card-body").find(".form-search").length === 0) {
        const $filterRow = $('<div class="row"></div>');
        var hasDatePicker = generateFilterForm($currentElement, $filterRow);
        const $filterForm = $(`
          <form class="no-validation main-width-lg form-search"></form>
        `).append($filterRow).append(`
          <div class='row filter-condition'>
            <div class="col-sm-6">Filter Condition: 
              <input type="radio" name="FilterType" value="AND" class="mr-1" checked="checked">
              <label for="AND" class="mr-3">AND</label>
              <input type="radio" name="FilterType" value="OR" class="mr-1">
              <label for="OR">OR</label>
            </div>
          </div>
          <div class="row">
            <div class="form-group col-sm-6">
              <button type="button" class="btn btn-primary btn-search-data">Search</button>
              <button type="button" class="btn btn-secondary reset-filter-btn">Reset</button>
            </div>
          </div>
        `);
        $currentElement.closest(".card-body").prepend(`
          <div id="accordion">
            <div class="card">
                <div class="card-header" style="background:#f3f3f3" id="search-panel" data-toggle="collapse"
                    data-target="#searh-panel-content" aria-expanded="true" aria-controls="collapse-search-panel">
                    <span class="card-title menu-title">ADVANCE SEARCH</span>
                </div>
                <div id="searh-panel-content" class="collapse hide" aria-labelledby="search-panel" data-parent="#accordion" style="padding: 0 20px !important; margin: 20px 0 !important">
                ${$filterForm.prop("outerHTML")}
                </div>
            </div>
        </div>`);

        if (hasDatePicker) {
          initDateTimePicker();
        }
      }

      api.on("responsive-resize", function (e, datatable, columns) {
        columns.forEach((element, index) => {
          const $cell = $currentElement.find(`thead tr:eq(1) th:nth-child(${index + 1})`);
          element ? $cell.show() : $cell.hide();
        });
      });
    }

    function generateFilterForm($tableElem, $filterRow) {
      var hasDatePicker = false;
      var fieldCount = 0;
      $tableElem.find("thead tr:eq(0) th").each(function (i) {
          let title = $(this).text()?.trim();
          if ($(this).data("name")) {
              title = $(this).data("name")
          }
        if ($(this).data("searchable") === false || !title) return;
        fieldCount++;
        if ($(this).data("datepicker")) {
          hasDatePicker = true;
          if(fieldCount % 2 === 0) {
            $filterRow.append(`<div class="col-sm-6"></div>`);
            fieldCount++;
          }
          $filterRow.append(`
            <div class="form-group col-sm-6">
              <label class="col-form-label">${title} From</label>
              <div>
                <input type='text' placeholder='dd/MM/yyyy' style='width:100%' class='date-picker form-control no-uppercase ${i}_datepicker_from' data-date-clear-btn='true' data-index='${i}'/>
              </div>
            </div>
            <div class="form-group col-sm-6">
              <label class="col-form-label">${title} To</label>
              <div>
                <input type='text' placeholder='dd/MM/yyyy' style='width:100%' class='date-picker form-control no-uppercase  ${i}_datepicker_to' data-date-clear-btn='true' data-index='${i}'/>
              </div>
            </div>
          `);
          fieldCount++;
        } else if ($(this).data("dropdown")) {
          const dropdownOptions = createDropdown($(this).data("dropdown"), title, i);
          $filterRow.append(dropdownOptions);
        } else if ($(this).data("checkbox")) {
          $filterRow.append(`
            <div class="form-group col-sm-6">
              <label class="col-form-label">${title}</label>
              <div class="radio-group">
                <label>
                  <input type="radio" name="${title}" value="" checked="checked" data-index="${i}"/>All
                </label>
                <label>
                  <input type="radio" name="${title}" value="true" data-index="${i}"/>Yes
                </label>
                <label>
                  <input type="radio" name="${title}" value="false" data-index="${i}"/>No
                </label>
              </div>
            </div>
          `);
        } else if ($(this).data("select2")) {
          const url = $(this).data("select2");
          const select2Html = `
            <select 
              data-index="${i}"
              class="select2-ajax"
              style="width: 100%"
              data-ajax--url="${url}"
              data-paging="20"
              data-allow-clear="true"
              data-placeholder="Select an option">
            </select>`;
          $filterRow.append(`
            <div class="form-group col-sm-6">
              <label class="col-form-label">${title}</label>
              <div>
                ${select2Html}
              </div>
            </div>
          `);
        } else {
          $filterRow.append(`
            <div class="form-group col-sm-6">
              <label class="col-form-label">${title}</label>
              <div>
                <input type="search" style='width:100%;' class='form-control no-uppercase' data-index='${i}'/>
              </div>
            </div>
          `);
        }
      });
      return hasDatePicker;
    }

    function createDropdown(options, title, i) {
      const $select = $(`<select class='form-control' data-index=${i}></select>`);
      $select.append("<option value=''>All</option>");
      $.each(options, (index, item) => {
        $select.append($("<option>").attr("value", item).text(item));
      });
      return `
        <div class="form-group col-sm-6">
          <label class="col-form-label">${title}</label>
          <div>
            ${$select.prop("outerHTML")}
          </div>
        </div>`;
    }
  },
  drawCallback:function(){
    setTimeout(()=>{
      $(window).resize()
    },100)
  }
});