// Load external data
d3.queue()
    .defer(d3.json, "data/world.geojson")
    .defer(d3.csv, "data/data_final.csv")
    .await(ready);

//Set zoom
document.body.style.zoom = "80%";


// Principal function
function ready(error, topo, co2) {

    // Map and Protection
    var svg_map = d3.select("#svg_map"),
        width = +svg_map.attr("width"),
        height = +svg_map.attr("height");

    var projection = d3.geoNaturalEarth1()
        .scale(140)
        .center([0, 25])
        .translate([width / 2, height / 2]);

    var svg_map_legend = d3.select("#svg_map_legend");
    var svg_bubble_legend_colors = d3.select("#svg_bubble_legend_colors");
    var svg_bubble_legend_sizes = d3.select("#svg_bubble_legend_sizes");


    // Data
    let data_co2_per_gdp = d3.map();
    let data_co2_per_land = d3.map();
    let data_co2_per_capita = d3.map();
    let data_co2_absolute = d3.map();

    let bubble_plot_data = [];

    let selected_country_data = [];

    let min_co2_per_gdp;
    let min_co2_tonnes_per_land_area_sqKm;
    let min_co2_per_capita;
    let min_co2_absolut;
    let min_population;
    let min_gdp;

    let max_co2_per_gdp;
    let max_co2_tonnes_per_land_area_sqKm;
    let max_co2_per_capita;
    let max_co2_absolut;
    let max_population;
    let max_gdp;


    function reset_min_max() {
        min_co2_per_gdp = 0; //0.003
        min_co2_tonnes_per_land_area_sqKm = 0;
        min_co2_per_capita = 0; // 0.004
        min_co2_absolut = 0; // 0.004
        min_population = 1606; //1606
        min_gdp = 104440000; //104440000


        max_co2_per_gdp = 4.1; //4.027
        max_co2_tonnes_per_land_area_sqKm = 128800; //128711.428571429
        max_co2_per_capita = 88; //87.615
        max_co2_absolut = 10700; //10667.888
        max_population = 1439323776;
        max_gdp = 18151620214784;

    }


    function filterData() {
        reset_min_max()
        bubble_plot_data = [];
        for (let index = 0; index < co2.length; index++) {
            let element = co2[index]
            if ((element.year === current_year) && (element.iso_code !== "na")) {
                data_co2_per_gdp.set(element.iso_code, +element.co2_per_gdp);
                data_co2_per_land.set(element.iso_code, +element.co2_tonnes_per_land_area_sqKm);
                data_co2_per_capita.set(element.iso_code, +element.co2_per_capita);
                data_co2_absolute.set(element.iso_code, element.co2_mio_tonnes);

                let is_pushable = false;
                if (selected_country_data.length !== 0) {
                    if (selected_country_data.includes(element.iso_code) && (element.iso_code !== "na") && !(isNaN(element.co2_per_gdp))) {
                        is_pushable = true;
                    }
                } else if ((element.iso_code !== "na") && (element.iso_code !== "WORLD") && !(isNaN(element.co2_per_gdp))) {
                    is_pushable = true;
                }
                if (is_pushable) {
                    bubble_plot_data.push({
                        "iso_code": element.iso_code,
                        "name": element.country,
                        "co2_per_gdp": +element.co2_per_gdp,
                        "co2_tonnes_per_land_area_sqKm": +element.co2_tonnes_per_land_area_sqKm,
                        "co2_per_capita": +element.co2_per_capita,
                        "co2_absolut": +element.co2_mio_tonnes,
                        "population": +element.population,
                        "gdp": +element.gdp,
                    })
                }
            }
        }
    }


    // Color Scales

    var colorScale_gdp = d3.scaleThreshold()
        .domain([0.1, 0.2, 0.4, 0.6, 0.8, 1])
        .range(d3.schemeOranges[7]);

    var domainLand = [0.5, 1, 10, 100, 1000, 2000];

    var colorScale_land = d3.scaleThreshold()
        .domain(domainLand)
        .range(d3.schemeGreens[7]);

    var colorScale_capita = d3.scaleThreshold()
        .domain([0.1, 0.5, 1, 5, 10, 15])
        .range(d3.schemePurples[7]);

    var colorScale_absolute = d3.scaleThreshold()
        .domain([0.1, 0.5, 5, 50, 500, 5000])
        .range(d3.schemeBlues[7]);

    var colorScale_relative = d3.scaleThreshold()
        .domain([0.001, 0.002, 0.02, 0.2, 2, 20])
        .range(d3.schemeReds[7]);

    var colorScale_bubble = d3.scaleThreshold()
        .domain(domainLand)
        .range(d3.schemeGreens[7])

    var colorScale = colorScale_gdp;

    var notAvailableColor = "#606060"


    //Titles
    var map_title = "";
    const title_generic = "Landkarte: "
    const map_title_gdp = title_generic + "CO2 pro BIP (Kilogramm / US-Dollar)";
    const map_title_land = title_generic + "CO2 pro Landfläche (Tonnen / Quadratkilometer)";
    const map_title_capita = title_generic + "CO2 pro Einwohner (Tonnen / Einwohner)";
    const map_title_absolute = title_generic + "CO2 absolut (Millionen Tonnen)";
    const map_title_relative = title_generic + "CO2 relativ zum weltweiten Ausstoss (Prozent)"

    //Unit of measurement
    const unit_gdp = "kg/$";
    const unit_land = "t/km²";
    const unit_capita = "t/Einw.";
    const unit_absolute = "Mio.t";
    const unit_relative = "%";
    var unit = unit_gdp;

    // Set current year
    var current_year = sliderValue.toString();

    //Radio Buttons
    var selectedRadio = "gdp";
    var radioButtons = document.querySelectorAll('input[name="radio"]');
    radioButtons.forEach(
        rb => rb.addEventListener("change", function () {
            if (rb.checked) {
                selectedRadio = rb.value;
            }
            update_all();
        }))

    // tooltip_map
    const tooltip_map = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background-color", "black")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("color", "white");

    // tooltip_bubble
    var tooltip_bubble = d3.select("body")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "black")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("color", "white");

    function round(value) {
        return (Math.round(value * 100000) / 100000).toFixed(3)
    }

    function getToolTipMapContent(d) {
        let value_co2_per_gdp = round(data_co2_per_gdp.get(d.id));
        let value_co2_per_land = round(data_co2_per_land.get(d.id));
        let value_co2_per_capita = round(data_co2_per_capita.get(d.id));
        let value_co2_absolut = round(data_co2_absolute.get(d.id));
        let relative = (Math.round((data_co2_absolute.get(d.id) / data_co2_absolute.get("WORLD")) * 100000) / 100000 * 100).toFixed(3);
        console.log("Tooltip: " + relative);

        let string = "<p><strong>" + d.id + " " + d.properties.name + "</strong></p>";
        if (selectedRadio === "gdp") {
            string = string + "<p style='color: yellow'>" + "CO2 pro BIP: " + value_co2_per_gdp + " (" + unit_gdp + ")" + "</p>";
        } else {
            string = string + "<p>" + "CO2 pro BIP: " + value_co2_per_gdp + " (" + unit_gdp + ")" + "</p>";
        }
        if (selectedRadio === "land") {
            string = string + "<p style='color: yellow'>" + "CO2 pro Landfläche: " + value_co2_per_land + " (" + unit_land + ")" + "</p>";
        } else {
            string = string + "<p>" + "CO2 pro Landfläche: " + value_co2_per_land + " (" + unit_land + ")" + "</p>";
        }
        if (selectedRadio === "capita") {
            string = string + "<p style='color: yellow'>" + "CO2 pro Einwohner: " + value_co2_per_capita + " (" + unit_capita + ")" + "</p>";
        } else {
            string = string + "<p>" + "CO2 pro Einwohner: " + value_co2_per_capita + " (" + unit_capita + ")" + "</p>";
        }
        if (selectedRadio === "absolute") {
            string = string + "<p style='color: yellow'>" + "CO2 absolut: " + value_co2_absolut + " (" + unit_absolute + ")" + "</p>";
        } else {
            string = string + "<p>" + "CO2 absolut: " + value_co2_absolut + " (" + unit_absolute + ")" + "</p>";
        }
        if (selectedRadio === "relative") {
            string = string + "<p style='color: yellow'>" + "CO2 relativ zum Weltausstoss: " + relative + " (" + unit_relative + ")" + "</p>";
        } else {
            string = string + "<p>" + "CO2 relativ zum Weltausstoss: " + relative + " (" + unit_relative + ")" + "</p>";
        }

        return string;
    }


    let mouseOver = function (d) {

        let tooltip_map_content = getToolTipMapContent(d)
        d3.select(this)
            .style("stroke", "black");
        tooltip_map.transition()
            .duration(250)
            .style("opacity", 0.88);

        tooltip_map.html(
            tooltip_map_content
        )
            .style("left", (d3.event.pageX - 160) + "px")
            .style("top", (d3.event.pageY - 50) + "px");
    }

    let mouseMove = function () {
        tooltip_map
            .style("left", (d3.event.pageX - 160) + "px")
            .style("top", (d3.event.pageY - 50) + "px");

    }
    let mouseLeave = function () {
        d3.select(this)
            .style("stroke", "grey")
        tooltip_map.transition()
            .duration(250)
            .style("opacity", 0);
    }

    function setScrollbarText(d, isButtonInput, text) {
        var scrollBar = document.getElementById("countryContainer")
        if (isButtonInput) {
            scrollBar.innerHTML = ""
            scrollBar.insertAdjacentHTML('beforeend', "<div style='margin-left: 10px'>" + text + "</div>")

        } else {
            if (selected_country_data.length === 0) {
                scrollBar.innerHTML = ""
                scrollBar.innerHTML = "<div style='margin-left: 10px; margin-top: 25px; color: grey; font-size: 17px'>Solange kein Land ausgewählt ist, zeigt Graph alle Länder an</div>"
            } else {

                if (selected_country_data.length === 1) {
                    scrollBar.innerHTML = ""
                }
                if (selected_country_data.length >= 1) {
                    scrollBar.insertAdjacentHTML('beforeend', "<div style='margin-left: 10px'>" + d.id + ", " + d.properties.name + "</div>")
                }
            }
        }

    }

    console.log(selected_country_data)


    let leftClick = function (d) {
        if (!selected_country_data.includes(d.id)) {
            selected_country_data.push(d.id);
            setScrollbarText(d);
            filterData();
            update_bubble_plot();
        }
    }


    var clearButton = document.getElementById("clearButton")
    clearButton.onclick = function (d) {
        selected_country_data = [];
        filterData();
        setScrollbarText(d);
        update_bubble_plot();
    }

    let g7Button = document.getElementById("g7Button")
    g7Button.onclick = function (d) {
        selected_country_data = ["USA", "CAN", "DEU", "FRA", "ITA", "GBR", "JPN"];
        filterData(d);
        setScrollbarText(d, true, "G7-Staaten");
        update_bubble_plot();
    }

    let g20Button = document.getElementById("g20Button")
    g20Button.onclick = function (d) {
        selected_country_data = ["USA", "CAN", "MEX", "BRA", "ARG", "TUR", "DEU", "ESP", "FRA", "ITA", "GBR", "JPN", "SAU", "ZAF", "RUS", "CHN", "IND", "IDN", "KOR", "AUS"];
        filterData(d);
        setScrollbarText(d, true, "G20-Staaten");
        update_bubble_plot();
    }

    let opecButton = document.getElementById("opecButton")
    opecButton.onclick = function (d) {
        selected_country_data = ["IRQ", "IRN", "KWT", "SAU", "ARE", "DZA", "LBY", "AGO", "GNQ", "GAB", "NGA", "COD", "QAT", "ECU", "VEN"];
        filterData(d);
        setScrollbarText(d, true, "OPEC-Staaten");
        update_bubble_plot();
    }


    //Listen for slider events
    addEventListener('sliderEvent', () => {
        update_all();
    }, false);


    // Slider
    const sliderYear = sliderFactory();
    d3.select('#svg_slider').call(sliderYear.height(70).margin({
        top: 35,
        right: 15,
        bottom: 15,
        left: 15
    }).value(current_year).ticks(5).scale(true).range([1970, 2020]).step(1).label(true));


    function update_all() {
        current_year = sliderValue.toString();
        filterData();
        color_map(svg_map);
        update_bubble_plot();
    }


    function color_map(map) {
        map.style("fill", function (d) {
            let selectedDataArray = select_data_by_radioButton(d);
            if (isNaN(selectedDataArray[0])) {
                return notAvailableColor
            } else {
                d3.select("#map_title").text(map_title)
                d.total = selectedDataArray[0] || 0;
                return selectedDataArray[1](d.total);
            }
        });

        let data_domain = [0];
        data_domain = data_domain.concat(colorScale.domain());
        data_domain.push("keine Daten verfügbar")
        let data_range = colorScale.range();
        data_range.push(notAvailableColor);
        let rect_size = 20;
        let y_distance = 25;
        svg_map_legend.html(null);

        svg_map_legend
            .selectAll("mydots")
            .data(data_domain)
            .enter()
            .append("rect")
            .attr("x", 5)
            .attr("y", function (d, i) {
                return y_distance + i * (rect_size + 5)
            })
            .attr("width", rect_size).attr("height", rect_size).style("fill", function (d, i) {
            return data_range[i]
        });

        svg_map_legend
            .append("text")
            .attr("x", 0)
            .attr("y", 15)
            .text("Legende in " + unit + ":");

        svg_map_legend
            .selectAll("mylabels")
            .data(data_domain)
            .enter()
            .append("text")
            .attr("x", 5 + rect_size * 1.2)
            .attr("y", function (d, i) {
                return y_distance + i * (rect_size + 5) + (rect_size / 2)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .text(function (d, i) {
                if (i === 0) {
                    return "> 0"
                } else if (i < data_domain.length - 1) {
                    return "> " + d;
                } else {
                    return d;
                }
            })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")
    }


    function select_data_by_radioButton(d) {
        let selectedMapData
        switch (selectedRadio) {
            case 'land':
                selectedMapData = data_co2_per_land.get(d.id);
                colorScale = colorScale_land;
                map_title = map_title_land;
                unit = unit_land;
                break;
            case 'capita':
                selectedMapData = data_co2_per_capita.get(d.id);
                colorScale = colorScale_capita;
                map_title = map_title_capita;
                unit = unit_capita;
                break;
            case 'absolute':
                selectedMapData = data_co2_absolute.get(d.id);
                colorScale = colorScale_absolute;
                map_title = map_title_absolute;
                unit = unit_absolute;
                break;
            case 'relative':
                selectedMapData = (Math.round((data_co2_absolute.get(d.id) / data_co2_absolute.get("WORLD")) * 100000) / 100000 * 100).toFixed(3);
                colorScale = colorScale_relative;
                map_title = map_title_relative;
                unit = unit_relative;
                console.log(selectedMapData)
                break;
            default:
                selectedMapData = data_co2_per_gdp.get(d.id);
                colorScale = colorScale_gdp;
                map_title = map_title_gdp;
                unit = unit_gdp;
                break;

        }
        return [selectedMapData, colorScale]
    }


    function draw_map() {
        svg_map = svg_map.append("g")
            .selectAll("path")
            .data(topo.features)
            .enter()
            .append("path")
            .attr("d", d3.geoPath()
                .projection(projection)
            )
            .style("stroke", "grey")
            .attr("class", function () {
                return "Country"
            })
            .style("opacity", 1)
            .on("mouseover", mouseOver)
            .on("mousemove", mouseMove)
            .on("mouseleave", mouseLeave)
            .on("click", leftClick)

        update_all();
    }


    function update_bubble_plot() {

        //sort array so that the biggest circles will be drawn first
        bubble_plot_data.sort(function (a, b) {
            return b["co2_absolut"] - a["co2_absolut"]
        })

        let bubble_svg = d3.select("#bubble_plot");

        bubble_svg.html(null);

        // set the dimensions and margins of the graph
        var margin = {top: 30, right: 20, bottom: 40, left: 50},
            width = 700 - margin.left - margin.right,
            height = 400 - margin.top - margin.bottom;

        // append the svg object to the body of the page
        var svg = d3.select("#bubble_plot")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        // Add X axis
        var x = d3.scaleLinear()
            .domain([min_co2_per_capita, max_co2_per_capita])
            .range([0, width]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
            .call(g => g.append("text")
                .attr("x", width - 180)
                .attr("y", margin.bottom - 8)
                .attr("fill", "black")
                .attr("font-size", "15px")
                .attr("text-anchor", "start")
                .text("CO2 pro Einwohner (t/Einw.)"));

        // Add Y axis
        var y = d3.scaleLinear()
            .domain([min_co2_per_gdp, max_co2_per_gdp])
            .range([height, 0]);
        svg.append("g")
            .call(d3.axisLeft(y))
            .call(g => g.append("text")
                .attr("x", -margin.left)
                .attr("y", -(margin.top / 2))
                .attr("fill", "black")
                .attr("font-size", "15px")
                .attr("text-anchor", "start")
                .text("CO2 pro BIP (kg/$)"));

        // Add a scale for bubble size
        var z = d3.scaleSqrt()
            .domain([min_co2_absolut, max_co2_absolut])
            .range([4, 40]);

        // Add a legend for bubble size
        let size_domain = [10000, 4000, 1000, 1]
        svg_bubble_legend_sizes.html(null);

        var xCircle = 55
        var xLabel = 110
        var yCircle = 120


        svg_bubble_legend_sizes
            .selectAll("mydots")
            .data(size_domain)
            .enter()
            .append("circle")
            .attr("cx", xCircle)
            .attr("cy", function (d) {
                return yCircle - z(d)
            })
            .attr("r", function (d) {
                return z(d)
            })
            .style("fill", "none")
            .attr("stroke", "black")

        svg_bubble_legend_sizes
            .append("text")
            .attr("x", 15)
            .attr("y", 15)
            .text("CO2 absolut in " + unit_absolute + ":");

        svg_bubble_legend_sizes
            .selectAll("mylabels")
            .data(size_domain)
            .enter()
            .append("line")
            .attr('x1', function (d) {
                return xCircle
            })
            .attr('x2', xLabel)
            .attr('y1', function (d) {
                return yCircle - 2 * z(d)
            })
            .attr('y2', function (d) {
                return yCircle - 2 * z(d)
            })
            .attr('stroke', 'black')
            .style('stroke-dasharray', ('2,2'));

        svg_bubble_legend_sizes
            .selectAll("mylabels")
            .data(size_domain)
            .enter()
            .append("text")
            .attr('x', xLabel)
            .attr('y', function (d) {
                return yCircle - 2 * z(d)
            })
            .text(function (d) {
                return d
            })
            .style("font-size", 16)
            .attr('alignment-baseline', 'middle')


        // Add a legend for bubble colors
        let data_domain = [0];
        data_domain = data_domain.concat(colorScale_bubble.domain())
        data_domain.push("keine Daten verfügbar");
        let data_range = colorScale_bubble.range();
        data_range.push(notAvailableColor);
        let rect_size = 20;
        let y_distance = 25;
        svg_bubble_legend_colors.html(null);

        svg_bubble_legend_colors
            .selectAll("mydots")
            .data(data_domain)
            .enter()
            .append("rect")
            .attr("x", 15)
            .attr("y", function (d, i) {
                return y_distance + i * (rect_size + 5)
            })
            .attr("width", rect_size).attr("height", rect_size).style("fill", function (d, i) {
            return data_range[i]
        }).style("opacity", 1)

        svg_bubble_legend_colors
            .append("text")
            .attr("x", 15)
            .attr("y", 15)
            .text("CO2 pro Landfläche in " + unit_land + ":");

        svg_bubble_legend_colors
            .selectAll("mylabels")
            .data(data_domain)
            .enter()
            .append("text")
            .attr("x", 15 + rect_size * 1.2)
            .attr("y", function (d, i) {
                return y_distance + i * (rect_size + 5) + (rect_size / 2)
            }) // 100 is where the first dot appears. 25 is the distance between dots
            .text(function (d, i) {
                if (i === 0) {
                    return "> 0"
                } else if (i < data_domain.length - 1) {
                    return "> " + d;
                } else {
                    return d;
                }
            })
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle")


        // Create 3 functions to show / update (when mouse move but stay on same circle) / hide the tooltip
        var showTooltip = function (d) {
            let value_co2_per_gdp = round(d["co2_per_gdp"]);
            let value_co2_per_land = round(d["co2_tonnes_per_land_area_sqKm"]);
            let value_co2_per_capita = round(d["co2_per_capita"]);
            let value_co2_absolut = round(d["co2_absolut"]);
            tooltip_bubble
                .transition()
                .duration(200)
                .style("opacity", 0.88)
            tooltip_bubble
                .html("<p><strong>" + d["iso_code"] + " " + d["name"] + "</strong></p>" +
                    "<p>" + "CO2 pro BIP: " + value_co2_per_gdp + " (" + unit_gdp + ")" + "</p>" +
                    "<p>" + "CO2 pro Landfläche: " + value_co2_per_land + " (" + unit_land + ")" + "</p>" +
                    "<p>" + "CO2 pro Einwohner: " + value_co2_per_capita + " (" + unit_capita + ")" + "</p>" +
                    "<p>" + "CO2 absolut: " + value_co2_absolut + " (" + unit_absolute + ")" + "</p>" +
                    "<p>" + "Einwohnerzahl: " + d["population"] + "</p>" +
                    "<p>" + "BIP absolut: " + d["gdp"] + " $" + "</p>")
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 10) + "px")
        }
        var moveTooltip = function () {
            tooltip_bubble
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 10) + "px")
        }
        var hideTooltip = function () {
            tooltip_bubble
                .transition()
                .duration(200)
                .style("opacity", 0)
        }

        // Add dots
        svg.append('g')
            .selectAll("dot")
            .data(bubble_plot_data)
            .enter()
            .append("circle")
            .attr("cx", function (d) {
                return x(d["co2_per_capita"]);
            })
            .attr("cy", function (d) {
                return y(d["co2_per_gdp"]);
            })
            .attr("r", function (d) {
                return z(d["co2_absolut"]);
            })
            .style("fill", function (d) {
                if (isNaN(d["co2_tonnes_per_land_area_sqKm"])) {
                    return notAvailableColor
                } else {
                    return colorScale_bubble(d["co2_tonnes_per_land_area_sqKm"]);
                }
            })
            .style("opacity", "1")
            .attr("stroke", "black")
            .style("stroke-width", "1px")
            .on("mouseover", showTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseleave", hideTooltip)
    }


// Initialise all
    draw_map();
    setScrollbarText();
    update_all();
}
