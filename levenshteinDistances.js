/*
Developer: Michelle Ho
Program: Plots an n by n matrix of model levenshtein distances
            Can display based on metric displayed in word alignment chart (e.g. signatures for top 10 MCC, top 10 logloss, etc.)
            Calculates sum of Levenshtein distances for one signature against the other n signatures and returns the best performing signature (lowest sum = greatest similarity to the other signatures)
            Sum down columns to reveal gene signature with the most similarity to other signatures compared
*/

//variables//
var signatureMap = new Map();

var modelArray = new Array();
var Fmodel_modelMap = new Map();
var LD_Fmodel_geneList = new Array();

var LD_geneMap = new Map();
var LD_sumArray = new Array();
var sum;
var lowest_LD;
var lowest_LD_model;

var margin = { top: 150, right: 10, bottom: 0, left: 160 };
var cellSize = 12;
var col_number = 277;
var row_number = 800;
var width = cellSize * col_number; // - margin.left - margin.right,
var height = cellSize * row_number; // - margin.top - margin.bottom,
var shift = 20;

var num_models = 10;



var colours = ["lightgrey", "green", "#FFB3CD", "red"];
var legendText = ["Same signature", "Levenshtein Distance < 0", "0 <= Levenshtein Distance < 5", "Levenshtein Distance >= 5"];

var LD_tooltip = d3.select("#levenshtein")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 1)

//Read input data files//
Promise.all([
    d3.tsv(globalVariable.levenshtein_file, function (d) {
        return {
            SignatureA: d.SignatureA,
            SignatureB: d.SignatureB,
            LD: +d.LD
        };
    }),
    d3.tsv(globalVariable.data_file),
]).then(
    function (files) {

        //levenshtein distance data file//
        console.log("LEVENSHTEIN");
        var levenshtein = files[0];
        var models = files[1];



        levenshtein.forEach(function (d) {
            var key = d.SignatureA + "\t" + d.SignatureB;
            signatureMap.set(key, d.LD);
        });

        console.log("MAP", signatureMap);

        //model + testing result data file//
        models.forEach(function (d) {
            d.Genes = formatGeneList(d.Genes);
            getModel(d.Set_of_parameters_modelNumber, d.Genes, Fmodel_modelMap);

            var geneList = d.Genes;
            if (geneList.includes(";")) {
                var s = "";
                geneList = geneList.split(";");
                geneList.sort();
                geneList.forEach(function (d, i) {
                    if (i == 1) {
                        s = d;
                    } else {
                        s = s + " " + d;
                    }
                });
                geneList = s;
            }

            var entry_noSplit = {
                model: d.Set_of_parameters_modelNumber,
                gene: geneList,
                C_Value: d.C_Value,
                Sigma_Value: d.Sigma_Value,
                MCC: +d.MCC,
                Misclass: +d.Misclass,
                Logloss: +d.LogLoss,
                GOF: +d.GOF
            };
            LD_Fmodel_geneList.push(entry_noSplit);
        });

        var svg = d3.select("#levenshtein").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        //update graph on selection list change (top 10 MCC, top 10 misclassification, etc.)
        $("#order").on('change', function (event) {
            var arr = order_LD(this.value, LD_Fmodel_geneList);
            console.log("change", this.value);
            update_LD(arr, svg);
        });

        //update graph on checkbox click (so graph doesn't just disappear)
        $("#checkbox_levenshtein").click(function () {
            update_LD(LD_Fmodel_geneList, svg);
            console.log("checkbox LD");
            console.log(LD_Fmodel_geneList);
        });

        //functions for mouse actions
        var mousemove = function (d, pos) {
            //Update the tooltip position and value
            LD_tooltip.transition()
                .duration(200)
                .style("opacity", 1)
            LD_tooltip.html("Model: " + d.model + "<br>Genes in model: " + d.gene + "<br>MCC:" + d.MCC)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 800) + "px")
                .style("background", "lightsteelblue")
                .style("z-index", 2000);
        }

        var mousemove_cell = function (d, pos) {
            //Update the tooltip position and value
            LD_tooltip.transition()
                .duration(200)
                .style("opacity", 1)
            LD_tooltip.html("Model X: " + d.modelID_B + "<br>Genes in model: " + d.sigB +
                "<br><br>Model Y: " + d.modelID_A + "<br>Genes in model: " + d.sigA +
                "<br><br> Levenshtein distance: " + d.LD)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (pos.y.baseVal.value + margin.top) + "px")
                .style("background", "lightsteelblue")
                .style("z-index", 1000);

            console.log(pos.y.baseVal.value + margin.top);
        }

        var mouseleave = function (d) {
            LD_tooltip.transition()
                .duration(200)
                .style("opacity", 0)
        }

        // plot/update figure

        function update_LD(LD_Fmodel_geneList, svg) {
            svg.selectAll("g").selectAll("text")
                .remove()

            //axis labels
            var rowLabels = svg.append("g")
                .selectAll(".rowLabelg")
                .data(LD_Fmodel_geneList)
                .enter()
                .filter(function (d, i) { return i < num_models; })
                .append("text")
                .text(function (d) { return d.model; })
                .attr("x", shift)
                .attr("y", function (d, i) { return i * cellSize; })
                .style("text-anchor", "end")
                .attr("transform", "translate(-6," + cellSize / 1.5 + ")")
                .attr("class", function (d, i) { return "rowLabel mono r" + i; })
                .on("mouseover", function (d) {
                    d3.select(this).classed("text-hover", true);
                    d3.selectAll(".sumLabel").classed("text-hover", function (s) { return s.model == d.model; });
                    mousemove(d, this);
                })
                .on("mouseout", function (d) {
                    d3.select(this).classed("text-hover", false);
                    d3.selectAll(".sumLabel").classed("text-hover", false);
                    mouseleave(d);
                })
                .on("click", function (d, i) { });

            var colLabels = svg.append("g")
                .selectAll(".colLabelg")
                .data(LD_Fmodel_geneList)
                .enter()
                .filter(function (d, i) { return i < num_models; })
                .append("text")
                .text(function (d) { return d.model; })
                .attr("x", 0)
                .attr("y", function (d, i) { return i * cellSize + shift; })
                .style("text-anchor", "left")
                .attr("transform", "translate(" + (cellSize / 1.5) + ", -10) rotate (-90)")
                .attr("class", function (d, i) { return "colLabel mono c" + i; })
                .on("mouseover", function (d) {
                    d3.select(this).classed("text-hover", true);
                    mousemove(d, this);
                })
                .on("mouseout", function (d) {
                    d3.select(this).classed("text-hover", false);
                    mouseleave(d);
                })
                .on("click", function (d, i) { });

            //get every pairwise combination of signatures to be displayed and get LD score from map
            var heatMapData = new Array();
            LD_sumArray = [];
            lowest_LD = Infinity;
            for (var i = 0; i < num_models; i++) {
                sum = 0;
                for (var j = 0; j < num_models; j++) {
                    var sA = LD_Fmodel_geneList[i].gene;
                    var sB = LD_Fmodel_geneList[j].gene;

                    var key = sA + "\t" + sB;
                    var sLD = signatureMap.get(key);
                    if (sLD === undefined) {
                        key = sB + "\t" + sA;
                        sLD = signatureMap.get(key);
                    }

                    if (sLD !== undefined) {
                        sLD = +sLD;
                    }

                    var entry = {
                        sigA: sA,
                        sigB: sB,
                        modelID_A: LD_Fmodel_geneList[i].model,
                        modelID_B: LD_Fmodel_geneList[j].model,
                        LD: sLD
                    };

                    heatMapData.push(entry);

                    if (sLD !== undefined) {
                        sum = sum + sLD;
                    }
                }

                var entrySum = {
                    sum: sum,
                    model: LD_Fmodel_geneList[i].model
                }
                if (sum < lowest_LD){
                    lowest_LD = sum;
                    lowest_LD_model = LD_Fmodel_geneList[i].model;
                }
                LD_sumArray.push(entrySum);
            }

            //get the gene signature with the lowest LD sum
            console.log(LD_sumArray, "lowest", lowest_LD);
            var i = findWithAttr(LD_Fmodel_geneList, "model", lowest_LD_model);
            i = LD_Fmodel_geneList[i].gene;
            document.getElementById('levenshtein_lowestLD').innerHTML = i;

            //right y axis label (sums of LD scores)
            var sumLabels = svg.append("g")
                .selectAll(".sumabezlg")
                .data(LD_sumArray)
                .enter()
                .append("text")
                .text(function (d) { return d.sum; })
                .attr("x", (num_models + 3) * cellSize)
                .attr("y", function (d, i) { return i * cellSize; })
                .attr("transform", "translate(-6," + cellSize / 1.5 + ")")
                .attr("font-weight", function(d){
                    if(d.sum == lowest_LD){
                        return 700;
                    }
                })
                .attr("class", function (d, i) { return "sumLabel mono r" + i; })
                .on("mouseover", function (d) {
                    d3.select(this).classed("text-hover", true);
                    d3.selectAll(".rowLabel").classed("text-hover", function (r, ri) { return r.model == d.model; });
                })
                .on("mouseout", function (d) {
                    d3.select(this).classed("text-hover", false);
                    d3.selectAll(".rowLabel").classed("text-hover", false);
                })
                
            
            //grid
            var heatMap = svg.append("g").attr("class", "g3")
                .selectAll(".cellg")
                .data(heatMapData)


            heatMap
                .enter()
                .append("rect")
                .attr("x", function (d) { return findWithAttr(LD_Fmodel_geneList, "model", d.modelID_A) * cellSize + shift; })
                .attr("y", function (d) { return findWithAttr(LD_Fmodel_geneList, "model", d.modelID_B) * cellSize; })
                .attr("class", function (d) { return "cell cell-border cr" + (d.modelID_A) + " cc" + (d.modelID_B); })
                .attr("width", cellSize)
                .attr("height", cellSize)
                .style("fill", function (d, i) {
                    if (d.LD < 0) {
                        return colours[1];
                    } else if (d.LD === undefined) {
                        return colours[0];
                    } else if (d.LD < 5) {
                        return colours[2];
                    } else if (d.LD <= 5) {
                        return colours[3];
                    }

                })
                .on("mouseover", function (d) {
                    //highlight text
                    d3.select(this).classed("cell-hover", true);
                    d3.selectAll(".rowLabel").classed("text-highlight", function (r, ri) { return r.model == d.modelID_B; });
                    d3.selectAll(".colLabel").classed("text-highlight", function (c, ci) { return c.model == d.modelID_A; });
                    d3.selectAll(".sumLabel").classed("text-highlight", function (s, si) { return s.model == d.modelID_B; });
                })
                .on("mousemove", function (d) {
                    mousemove_cell(d, this)
                })
                .on("mouseout", function (d) {
                    d3.select(this).classed("cell-hover", false);
                    d3.selectAll(".rowLabel").classed("text-highlight", false);
                    d3.selectAll(".colLabel").classed("text-highlight", false);
                    d3.selectAll(".sumLabel").classed("text-highlight", false);
                    mouseleave(d);
                });

                
            //Axis label for right y axis (sums of LD scores)
            var sumAxisLabel = svg.append("text")
                .text("Sum of Levenshtein Distances")
                .attr("y", function (d) {
                    var x = ((num_models + 3) * cellSize) / 2;
                    return x;
                })
                .attr("x", function (d) {
                    var x = (num_models + 5) * cellSize;
                    return x;
                })
                .attr("font-weight", 700)
                .style("text-anchor", "left");


            //legend of colours
            var legend = svg.append("g").attr("class", "g3")
                .selectAll(".cellg")
                .data(legendText)
                .enter()
                .append("text")
                .text(function (d) { return d; })
                .attr("x", 0)
                .attr("y", function (d, i) { return i * cellSize + (num_models + 5) * cellSize; })

            var legendColours = svg.append("g").attr("class", "g3")
                .selectAll(".cellg")
                .data(colours)
                .enter()
                .append("rect")
                .attr("x", -20)
                .attr("y", function (d, i) { return i * cellSize + (num_models + 4.25) * cellSize; })
                .attr("width", cellSize)
                .attr("height", cellSize)
                .style("fill", function (d) {
                    return d;
                })

        } //update

        
        //load figure on page load
        $(document).ready(function () {
            var arr = order_LD($("#order")[0].value, LD_Fmodel_geneList);
            update_LD(arr, svg);
        }); 

    } //promiseAll --> then
);


//functions -- model file
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

function formatGeneList(geneList) {
    //space delimited instead of semicolon delimited
    //sort genes in signature alphabetically
    if (geneList.includes(";")) {
        var s = "";
        geneList = geneList.split(";");
        geneList.sort();
        geneList.forEach(function (d, i) {
            if (i == 0) {
                s = d;
            } else {
                s = s + " " + d;
            }
        });
        return s;
    } else {
        return geneList;
    }
}

function getModel(model, geneList, modelMap) {
    modelMap.set(model, geneList.split(" ").sort());
}

//get index of object by its property
function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}

/////SORT FUNCTIONS///////////
function order_LD(value, model_genelist) {
    console.log("ORDER CHANGE", value);
    if (value == "sortMCC") {
        return sortByMCC_LD(model_genelist);

    } else if (value == "sortLogloss") {
        return sortByLogloss_LD(model_genelist);

    } else if (value == "sortMisclass") {
        return sortByMisclassification_LD(model_genelist);

    } else if (value == "sortGOF") {
        return sortByGOF_LD(model_genelist);
    }
}

function sortByGOF_LD(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(b, a, "GOF"); //Best GOF is 0, worse as GOF increases
    });
    //console.log("GOF", x.length);
    return x;
}

function sortByLogloss_LD(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(b, a, "Logloss"); //Best logloss is 0, worse as logloss increases
    });

    return x;
}

function sortByMisclassification_LD(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(b, a, "Misclass"); //Best misclassification is 0, worse as misclassification increases
    });
    return x;
}

function sortByMCC_LD(model_geneList_noSplit) {
    var x = model_geneList_noSplit.sort(function (a, b) {
        return sortFunction(a, b, "MCC");
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

//#endregion
///////////////////////////////