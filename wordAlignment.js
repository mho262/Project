/*
Developer: Michelle Ho
Program: Displays the genes in the signatures of the drug response prediction models
            Signatures are aligned to highlight consensus genes (genes that appear across multiple signatures), shown in green
            Top 10 signatures for each performance metric are shown:
                Matthews Correlation Coefficient
                Misclassification
                Log loss
                Goodness of fit
            Signatures are ordered by performance, with the option to order by Levenshtein distance (LD) score
            LD score ordering is based on the signature's LD score calculated against the signature found to have the lowest LD summation score (sum of all pairwise LD scores of that signature against signatures)
*/

//variables
var signatureMap = new Map();
var modelArray = new Array();

var Fmodel_geneMap = new Map();
var Fmodel_modelMap = new Map();
var Fmodel_geneList = new Array();
var Fmodel_geneList_noSplit = new Array();

var pathwayMap = new Map();

var LD_geneMap = new Map();

var first = true;

var lowestLD_signature;


//Read input file
Promise.all([
    d3.tsv(globalVariable.levenshtein_file, function (d) {
        //levenshtein distance scores
        return {
            SignatureA: d.SignatureA,
            SignatureB: d.SignatureB,
            LD: +d.LD
        };
    }),
    d3.tsv(globalVariable.data_file), //model test results
    d3.tsv("pathway-gene-relations.txt"), //gene pathway information
]).then(
    function (files) {
        //d3.selectAll('.tooltip').remove() ---- only needed if tooltip persists after page load

        //get data
        var levenshtein = files[0];
        var models = files[1];
        var pathway_data = files[2];
        var cell_height = 20;
        var cell_width = 60;
        var num_rows = 10;

        /////model scoring information///////
        models.forEach(function (d,i) {
            getGenes(d.Genes, Fmodel_geneMap);
            getModel(d.Set_of_parameters_modelNumber, d.Genes, Fmodel_modelMap);
            returnGenetoModel(i, Fmodel_geneList, Fmodel_geneList_noSplit, d.Genes, d.Set_of_parameters_modelNumber, d.MCC, d.Misclass, d.LogLoss, d.GOF, d.C_Value, d.Sigma_Value); //array with information
        });

        model = sortByMCC(Fmodel_geneList_noSplit);

        //////////////pathway information/////////
        pathway_data.forEach(function (d) {
            pathwayMap.set(d.gene, d.pathway);
        });

        //y axis label
        for (var i = 1; i <= num_rows; i++) {
            modelArray.push("Model");
        }
        //////////////////////////////

        ////levenshtein distance information ////
        //#region
        levenshtein.forEach(function (d) {
            var key = d.SignatureA + "\t" + d.SignatureB;
            signatureMap.set(key, d.LD);
        });

        //#endregion
        ////////////////////////////////////////


        ///plain drop down menu
        d3.select("#order").on("change", function () {
            //document.getElementById("checkbox_levenshtein").checked = false;
            $("input[type=checkbox]")[0].checked = false;

            LD = false;
            first = false;
            var arr = order(this.value, Fmodel_geneList_noSplit);

            var gridData = getGridData(num_rows, cell_width, cell_height, Fmodel_geneMap, arr, LD);
            var num_columns = gridData[1];
            gridData = gridData[0];
            gridData = collapseGridData(gridData, num_rows, num_columns, cell_width, Fmodel_geneMap);

            for (var i = 0; i < num_rows; i ++){
                console.log("order", arr[i].list_order);
            }
            update(gridData, arr, this.value, num_rows, cell_height, cell_width);

        });
        ////////////////////
        function checkbox() {
            lowestLD_signature = document.getElementById('levenshtein_lowestLD').innerHTML;
            console.log(lowestLD_signature);

            var arr = sortByLD(Fmodel_geneList_noSplit, signatureMap, lowestLD_signature, num_rows);

            var gridData = getGridData(num_rows, cell_width, cell_height, Fmodel_geneMap, arr, LD);
            var num_columns = gridData[1];
            gridData = gridData[0];
            gridData = collapseGridData(gridData, num_rows, num_columns, cell_width, Fmodel_geneMap);
            update(gridData, arr, "sortLD", num_rows, cell_height, cell_width);
        }

        ///checkbox 
        $("#checkbox_levenshtein").click(function () {
            if ($("input[type=checkbox]").is(
                ":checked")) {
                checkbox();
            } else {
                LD = false;
                first = false;
                var order_val = $("#order")[0].value;
                var arr = order(order_val, Fmodel_geneList_noSplit);

                var gridData = getGridData(num_rows, cell_width, cell_height, Fmodel_geneMap, arr, LD);
                var num_columns = gridData[1];
                gridData = gridData[0];
                gridData = collapseGridData(gridData, num_rows, num_columns, cell_width, Fmodel_geneMap);
                update(gridData, arr, order_val, num_rows, cell_height, cell_width);
            }
        });

        ////////////////////

        //////////////Grid//////////////////////
        LD = false;
        var gridData = getGridData(num_rows, cell_width, cell_height, Fmodel_geneMap, model, LD);
        var num_columns = gridData[1];
        gridData = gridData[0];
        gridData = collapseGridData(gridData, num_rows, num_columns, cell_width, Fmodel_geneMap);
        //console.log(gridData);

        var margin_left = 75;
        var margin_top = 25;
        var margin_right = 75
        var margin_bottom = 25;
        var width = num_columns * cell_width;

        var grid = d3.select("#grid")
            .append("svg")
            .attr("width", width + margin_left + margin_right)
            .attr("height", num_rows * cell_height + margin_bottom + margin_top)
            .append("g")
            .attr("transform", "translate(" + margin_left + "," + margin_top + ")");

        if (!first) {
            d3.selectAll("grid").remove();

            grid = d3.select("#grid")
                .append("svg")
                .attr("width", width + margin_left + margin_right)
                .attr("height", num_rows * cell_height + margin_bottom + margin_top)
                .append("g")
                .attr("transform", "translate(" + margin_left + "," + margin_top + ")");
        }

        // Define the div for the tooltip
        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);


        var rowLabels = grid.append("g")
            .selectAll(".rowLabelg")
            .data(Fmodel_geneList_noSplit)
            .enter()
            .filter(function (d, i) {
                return i < num_rows;
            })
            .append("text")
            .text(function (d) {return "Model " + d.list_order; })
            .attr("x", 10)
            .attr("y", function (d, i) { return i * cell_height; })
            .style("text-anchor", "end")
            .attr("transform", "translate(-6," + cell_height / 1.5 + ")")
            .attr("class", function (d, i) { return "rowLabel mono r" + i; })
            .on("mouseover", function (d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html("Model id: " + d.model +
                    "<br> C value: " + d.C_Value + "&nbsp Sigma value: " + d.Sigma_Value +
                    "<br> MCC: " + d.MCC)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        var col_count = 0;
        var sortBy = "MCC";
        var row = grid.selectAll(".row")
            .data(gridData)
            .enter().append("g")
            .attr("class", "row");

        var column = row.selectAll(".square")
            .data(function (d) { col_count = d.length; return d; })
            .enter()
            .append("rect")
            .attr("class", "square")
            .attr("x", function (d) { return d.x; })
            .attr("y", function (d) { return d.y; })
            .attr("width", function (d) { return d.width; })
            .attr("height", function (d) { return d.height; })
            .style("fill", "#fff")
            .style("stroke", "#222")

        var labels = row.selectAll(".label")
            .data(function (d) { return d; })
            .enter()
            .append("text")
            .attr("x", function (d) { return d.x; })
            .attr("y", function (d) { return d.y; })
            .text(function (d) {
                if (d.gene_present == true) {
                    return d.label_gene;
                }
            })
            .style("text-anchor", "middle")
            .style("fill", function (d) { return d.text_Colour; })
            .style("font-weight", function (d) { return d.text_weight; })
            .style("font-family", "Times New Roman")
            .attr("transform", "translate(" + cell_width / 2 + ",   15)")
            .on("mouseover", function (d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html("Gene pathways: " + d.pathways)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        var rowQuantitativeLabels = grid.append("g")
            .selectAll(".rowLabelg")
            .data(models)
            .enter()
            .filter(function (d, i) {
                return i < num_rows;
            })
            .append("text")
            .text(function (d) {
                var x = d[sortBy];
                return x;
            })
            .attr("x", (col_count) * cell_width + 20)
            .attr("y", function (d) { return models.indexOf(d) * cell_height; })
            .style("text-anchor", "beginning")
            .attr("transform", "translate(-6," + cell_height / 1.5 + ")");

        var axisLabel = grid.append("text")
            .text("| MCC |")
            .attr("transform", "rotate(90)")
            .attr("y", 0 - (col_count + 2) * cell_width)
            .attr("x", ((num_rows * cell_height) / 2))
            .attr("dy", "1em")
            .attr("font-weight", 700)
            .style("text-anchor", "middle");


        console.log("end");

        //loadRScript();


        function update(gridData, arr, order, num_rows, cell_height, cell_width) {
            var col_count = 0;

            row
                .data(gridData)
                .enter()
                .merge(row);

            column
                .data(function (d) { col_count = d.length; return d; })
                .enter()
                .merge(column);


            var svg = d3.select("#grid").data(gridData).enter();


            //remove text in grid (gene names)
            svg.selectAll("g").selectAll("text")
                .filter(function (d) {
                    if (typeof d == "object") { return d; }
                })
                .remove()

            //remove old grid squares
            svg.selectAll("rect")
                .remove();
            //insert squares for new grid

            row.selectAll(".square")
                .data(function (d) { return d; })
                .enter()
                .append("rect")
                .attr("class", "square")
                .attr("x", function (d) { return d.x; })
                .attr("y", function (d) { return d.y; })
                .attr("width", function (d) { return d.width; })
                .attr("height", function (d) { return d.height; })
                .style("fill", "#fff")
                .style("stroke", "#222")

            //insert new gene labels
            labels = row.selectAll(".label")
                .data(function (d) { return d; })
                .enter()
                .append("text")
                .attr("x", function (d) { return d.x; })
                .attr("y", function (d) { return d.y; })
                .text(function (d) {
                    if (d.gene_present == true) {
                        return d.label_gene;
                    }
                })
                .style("text-anchor", "middle")
                .style("fill", function (d) { return d.text_Colour; })
                .style("font-weight", function (d) { return d.text_weight; })
                .attr("transform", "translate(" + cell_width / 2 + ",   15)")
                .on("mouseover", function (d) {
                    div.transition()
                        .duration(200)
                        .style("opacity", .9);
                    div.html("Gene pathways: " + d.pathways)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function (d) {
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            //order is sort.... (e.g. sortLogloss)
            order = order.slice(4, order.length);
            console.log(num_rows, col_count);

            var order_list = $("#order")[0].value;
            order_list = order_list.slice(4, order_list.length);

            rowLabels = grid.append("g")
                .selectAll(".rowLabelg")
                .data(arr)
                .enter()
                .filter(function (d, i) {
                    return i < num_rows;
                })
                .append("text")
                .text(function (d) { console.log("list order", d.list_order); return "Model " + d.list_order; })
                .attr("x", 10)
                .attr("y", function (d, i) { return i * cell_height; })
                .style("text-anchor", "end")
                .attr("transform", "translate(-6," + cell_height / 1.5 + ")")
                .attr("class", function (d, i) { return "rowLabel mono r" + i; })
                .on("mouseover", function (d) {
                    div.transition()
                        .duration(200)
                        .style("opacity", .9);
                    div.html("Model id: " + d.model +
                        "<br> C value: " + d.C_Value + "&nbsp Sigma value: " + d.Sigma_Value +
                        "<br>" + order_list + ": " + d[order_list])
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function (d) {
                    div.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            //e.g. MCC, GOF, etc
            rowQuantitativeLabels = grid.append("g")
                .selectAll(".rowLabelg")
                .data(arr)
                .enter()
                .filter(function (d, i) {
                    return i < num_rows;
                })
                .append("text")
                .text(function (d) {
                    var x = d[order];
                    if (order == "LD" && x == Number.NEGATIVE_INFINITY){
                        x = "base signature";
                    }
                    return x;
                })
                .attr("x", (col_count) * cell_width + 20)
                .attr("y", function (d) { return arr.indexOf(d) * cell_height; })
                .style("text-anchor", "beginning")
                .attr("transform", "translate(-6," + cell_height / 1.5 + ")");


            axisLabel
                .transition().duration(25)
                .attr("y", 0 - (col_count + 2) * cell_width)
                .attr("font-weight", 700)
                .attr("letter-spacing", function(d){
                    if(order == "LD" || order == "Misclass" || order == "GOF"){
                        return "2px";
                    } else {
                        return "0px";
                    }
                })
                .text(getProperLabel(order));

        };

    }

)

///updating functions
//#region
function order(value, model_genelist) {
    console.log("ORDER CHANGE!!", value);
    var x = new Array();
    if (value == "sortMCC") {
        x = sortByMCC(model_genelist);

    } else if (value == "sortLogloss") {
        x = sortByLogloss(model_genelist);

    } else if (value == "sortMisclass") {
        x = sortByMisclassification(model_genelist);

    } else if (value == "sortGOF") {
        x = sortByGOF(model_genelist);
    }

    for (var i = 0; i < 10; i ++){
        console.log("orderfunction", x[i].list_order);
    }

    return x;
}

//gridData function
//try to collapse grid here? OR make another function that takes grid data and collapses there
function getGridData(rows, cell_width, cell_height, Fmodel_geneMap, setOfSignatures, LD) {
    var data = new Array();
    var xpos = 10; //starting xpos and ypos at 1 so the stroke will show when we make the grid below
    var ypos = 1;

    var geneSet = new Set();
    for (var i = 0; i < rows; i++) {
        temparr = setOfSignatures[i].gene.split(";");
        temparr.forEach(item => geneSet.add(item));
    }
    console.log("GENESET", geneSet);
    geneArray = Array.from(geneSet)
    var columns = geneArray.length;

    if (!LD) {
        Fmodel_geneMap.clear();
    }

    // iterate for rows 
    for (var row = 0; row < rows; row++) {
        data.push(new Array());
        var geneSignature;
        if (LD) {
            /**
            geneSignature = returnGenesFromSignature(setOfSignatures[row])
            getGenes(geneSignature, LD_geneMap);
            **/
        } else {
            geneSignature = setOfSignatures[row].gene.split(";");
            getGenes(geneSignature, Fmodel_geneMap);
        }

        // iterate for cells/columns inside rows
        for (var column = 0; column < columns; column++) {
            var present = false;
            if (geneSignature.includes(geneArray[column])) {
                present = true;
            }

            data[row].push({
                x: xpos,
                y: ypos,
                width: cell_width,
                height: cell_height,
                label_gene: geneArray[column],
                gene_present: present,
                text_Colour: "black",
                text_weight: 400,
                pathways: pathwayMap.get(geneArray[column])
            })
            // increment the x position. I.e. move it over by 50 (width variable)
            xpos += cell_width;
        }
        // reset the x position after a row is complete
        xpos = 10;
        // increment the y position for the next row. Move it down 50 (height variable)
        ypos += cell_height;
    }
    return [data, columns];
}

function collapseGridData(gridData, rows, columns, cell_width, geneMap) {
    for (var row = 0; row < rows; row++) {
        var ctr = 0;
        var row_current = gridData[row];

        for (var column = 0; column < columns; column++) {
            var cell = row_current[column];

            if (cell.gene_present == false) {
                ctr++;
            } else {
                if (geneMap.get(cell.label_gene) > 1) {
                    ctr = 0;
                    cell.text_Colour = "limegreen";
                    cell.text_weight = 700;
                } else {
                    if (ctr > 0) {
                        //cell.x = cell.x - (cell_width * ctr);
                        gridData[row] = arraySwap(row_current, column, column - ctr);
                    }
                }
            }
        }
    }

    //get rid of empty columns
    var removeColumns_arr = new Array();

    for (var column = columns - 1; column > 0; column--) {
        var emptyColumn = false;
        //var removeColumn = true;
        for (var row = 0; row < rows; row++) {
            cell = gridData[row][column];
            if (cell.gene_present) {
                emptyColumn = false;
                break;
            } else {
                emptyColumn = true;
            }
        }
        if (emptyColumn) {
            for (var c = column; c < columns - 2; c++) {

                for (var row = 0; row < rows; row++) {
                    //console.log("remove check", gridData[row]);
                    var cell_column = c + 1;
                    cell = gridData[row][cell_column];
                    //console.log("GENE", cell.label_gene, geneMap.get(cell.label_gene)) //
                    while ((cell_column < columns - 1) && (!cell.gene_present) && (geneMap.get(cell.label_gene) <= 1)) {
                        cell_column++;
                        cell = gridData[row][cell_column];
                    }

                    gridData[row] = arraySwap(gridData[row], c, cell_column);

                }


            }
        }
    }

    //remove empty columns (after swapping)
    for (var column = columns - 1; column > 0; column--) {
        var removeColumn = true;
        for (var row = 0; row < rows; row++) {
            if (gridData[row][column].gene_present == true) {
                removeColumn = false;
                break;
            }
        }

        if (removeColumn) {
            removeColumns_arr.push(column);
        }
    }


    removeColumns_arr.forEach(function (d) {
        for (var row = 0; row < rows; row++) {
            gridData[row].splice(d, 1);
        }
    })



    return gridData;
}

//#endregion

///functions for model file ///
//#region
function getGenes(geneList, geneMap) {
    if (geneList.includes(";")) {
        geneList = geneList.split(";");
    }

    if (!Array.isArray(geneList)) {
        geneList = Array.from(geneList);
    }

    geneList.forEach(function (d) {
        if (geneMap.has(d) == false) {
            geneMap.set(d, 1);
        } else {
            geneMap.set(d, geneMap.get(d) + 1);
        }
    })
}

function getModel(model, geneList, modelMap) {
    modelMap.set(model, geneList.split(";").sort());
}

function returnGenetoModel(ctr, model_geneList, model_geneList_noSplit, geneList, model, MCC, Misclass, LogLoss, GOF, C, Sigma) {
    geneList_split = geneList.split(";");

    for (var gene in geneList_split) {
        var entry = {
            model: model,
            gene: geneList_split[gene],
            C_Value: C,
            Sigma_Value: Sigma,
            MCC: +MCC,
            Misclass: +Misclass,
            Logloss: +LogLoss,
            GOF: +GOF
        };
        model_geneList.push(entry);
    }

    var entry_noSplit = {
        model: model,
        gene: geneList_split.sort().join(";"),
        C_Value: C,
        Sigma_Value: Sigma,
        MCC: +MCC,
        Misclass: +Misclass,
        Logloss: +LogLoss,
        GOF: +GOF,
        list_order: ctr,
        LD: undefined
    };
    model_geneList_noSplit.push(entry_noSplit);

}

/////SORT FUNCTIONS///////////
function sortByGOF(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(b, a, "GOF"); //Best GOF is 0, worse as GOF increases
    });
    
    for (var i = 0; i < model_geneList_noSplit.length; i++) {
        x[i].list_order = i;
    }

    return x;
}

function sortByLogloss(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(b, a, "Logloss"); //Best logloss is 0, worse as logloss increases
    });

    for (var i = 0; i < model_geneList_noSplit.length; i++) {
        x[i].list_order = i;
    }

    return x;
}

function sortByMisclassification(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(b, a, "Misclass"); //Best misclassification is 0, worse as misclassification increases
    });

    for (var i = 0; i < model_geneList_noSplit.length; i++) {
        x[i].list_order = i;
        console.log("misclass sort", x[i].list_order);
    }

    return x;
}

function sortByMCC(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(a, b, "MCC");
    });

    for (var i = 0; i < 10; i++) {
        x[i].list_order = i;
    }

    return x;
}

function sortByLD(model_geneList_noSplit, LD_signatureMap, lowestLD, num_rows) {
    model_geneList_noSplit.forEach(function (d) {
        geneList_formatted = d.gene.split(";").sort().join(" ");
        var key = lowestLD + "\t" + geneList_formatted;
        var score = LD_signatureMap.get(key);
        //console.log(key, "\t", score);
        if (score === undefined) {
            key = geneList_formatted + "\t" + lowestLD;
            score = LD_signatureMap.get(key);
        }

        if (score === undefined) {
            score = Number.NEGATIVE_INFINITY;
        }
        d.LD = score
    });

    var LD_arr = new Array();
    for (var i = 0; i < num_rows; i++) {
        LD_arr.push(model_geneList_noSplit[i]);
    }


    var x = LD_arr.sort(function (a, b) {
        return sortFunction(b, a, "LD"); //lower score is better
    });

    return x;
}

function sortFunction(a, b, criteria) {
    //if criteria is Logloss, GOF, or Misclass, if a = b, will then sort by MCC
    if (criteria == "MCC") {
        a_sort = Math.abs(a[criteria]);
        b_sort = Math.abs(b[criteria]);
    } else {
        a_sort = a[criteria];
        b_sort = b[criteria];
    }
    if (a_sort === b_sort) {
        if (criteria == "Misclass" || criteria == "GOF") {
            if (Math.abs(a.MCC) == Math.abs(b.MCC)) {
                return a.Logloss > b.Logloss ? -1 : 1;
            } else {
                return Math.abs(a.MCC) > Math.abs(b.MCC) ? -1 : 1;
            }
        } else {
            return 0;
        }
    } else {
        return a_sort > b_sort ? -1 : 1;
    }
}

function arraySwap(arr, fromIndex, toIndex) {
    var element0 = arr[fromIndex];
    var element1 = arr[toIndex];

    var x0 = element0.x;
    var x1 = element1.x;

    element0.x = x1;
    element1.x = x0;

    arr[fromIndex] = element1;
    arr[toIndex] = element0;
    return arr;
}

function getProperLabel(label) {
    if (label == "Logloss") { return "Log Loss"; }
    switch (label) {
        case "Misclass":
            return "Misclassification";
        case "GOF":
            return "Goodness of Fit";
        case "MCC":
            return "| MCC |";
        case "Logloss":
            return "Log Loss";
        case "LD":
            return "Levenshtein Distance";
        default:
            console.log(label, "wrong value");
    }
}
//#endregion
///////////////////////////////


///////////////////////////////

///functions for LD file not used///
//#region
function setSignatureMap(signatureMap, signature, setOfSimilar) {
    setOfSimilar = returnSignaturesFromSimilar(setOfSimilar);
    signatureMap.set(signature, setOfSimilar);

    //map format: signature ==> [[sim_sig, LD], [sim_sig, LD], [sim_sig, LD]]
}

function returnSignaturesFromSimilar(setofSimilar) {
    if (setofSimilar.indexOf(";") == -1) {
        signatureList = setofSimilar;
        signatureList = splitLDfromSig(signatureList);
    } else {
        signatureList = setofSimilar.split(";");
        signatureList.forEach(function (d, i) {
            this[i] = splitLDfromSig(d);
        }, signatureList);
    }

    return signatureList;
}

function splitLDfromSig(signature) {
    signature = signature.split(", ");
    signature[1] = +signature[1];
    return signature;
}

//returns just the genes in the signature, no LD
function returnGenesFromSignature(signature) {
    if (signature.indexOf(", ") == -1) {
        geneList = signature;
    } else {
        signature = signature.split(", ");
        geneList = signature[0];
        //levenshteinDistance = signature[1];
    }

    geneList = geneList.split(" ");

    return geneList;
}

//#endregion