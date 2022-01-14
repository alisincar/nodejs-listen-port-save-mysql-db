const mysql = require('mysql');
const Net = require('net');
const {
    Readable
} = require('stream');

// Dinlemek istediğimiz portu belirtiyoruz
const port = 7005;
//Veritabanı bağlantı bilgileri
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: ""
});


con.connect(function(err) {
    if (err) throw err;
    console.log("Veritabanına bağlantı kuruldu!");
    //Öncelikle veritabanımız yoksa veritabanı kurulu yapılacak
    con.query("CREATE DATABASE IF NOT EXISTS port_listen_db", function(err, result) {
        if (err) throw err;
    });
    //kurduğumuz veritabanını kullanacağız
    con.query('use port_listen_db');
    //Eğer tablo yoksa yeni bir tablo oluşturuyoruz
    var sql = "CREATE TABLE IF NOT EXISTS logs (id int NOT NULL AUTO_INCREMENT, buffer_data LONGTEXT DEFAULT NULL,json_data LONGTEXT DEFAULT NULL,string_data LONGTEXT DEFAULT NULL, time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY (id))";
    con.query(sql, function(err, result) {
        if (err) throw err;
    });
    console.log("Veritabanı konusunda herhangi bir sorun yok, verileri kaydetmeye hazırız :)")
});



// Bir TCP serveri oluşturduk
const server = new Net.createServer();
// Sunucu herhangi bir istemcinin bağlantı isteğini dinleyecek
server.listen(port, function() {
    console.log(`Server listening for connection requests on socket localhost:${port}`);
});

// Bir istemci sunucuyla bağlantı talep ettiğinde, sunucu yeni bir bağlantı oluşturur.
// ve bu bağlantı o istemciye özeldir
server.on('connection', function(socket) {
    console.log('Yeni bir baglanti kuruldu');

    // Artık bir TCP bağlantısı kurulduğuna göre, sunucu istemci soketine yazarak bu adrese veri gönderebilir
    socket.write('Merhaba :))');

    // Sunucu ayrıca soketi okuyarak istemciden veri alabilir.
    socket.on('data', function(data) {
        /*
        Gelen datayı Stream tipini çevirmek için kullanılabilir.
        let stream = Readable.from(data);
        */
        //Gelen veriyi JSON tipine çeviriyoruz
        let json = JSON.stringify(data);
        //Gelen veriyi string tipine çeviriyoruz çünkü bu tarz bağlantılarda Binary Buffer gönderilir.
        let string_data = data.toString();
        //Mysql bağlantısı kuruyoruz
        con.connect(function(err) {
            //Yukarıda kurulduğundan emin olduğumuz tabloyu kullanıyoruz
            con.query('use port_listen_db');
            //Veri tabanına kayıt işlemimizi yapıyoruz
            var sql = `INSERT INTO logs (buffer_data, json_data,string_data) VALUES (${mysql.escape(data)}, ${mysql.escape(json)},${mysql.escape(string_data)})`;
            con.query(sql, function(err, result) {
                if (err) throw err;
                console.log("1 baglanti kaydedildi");
            });
        });

        // console.log(`İstemciden alinan veriler: ${string_data}`);
        console.log(`json'a donusturulen veriler: ${json}`);
    });

    //İstemci, sunucuyla TCP bağlantısını sonlandırmak istediğinde, sunucu bağlantıyı sonlandırır.
    socket.on('end', function() {
        console.log('Istemci ile baglanti kapatildi');
    });

    // Kendi iyiliğin için hatayı yakalamayı unutma.
    socket.on('error', function(err) {
        console.log(`Error: ${err}`);
    });
});
